let games = [];

// DOM Elements
const nameInput = document.getElementById('gameName');
const urlInput = document.getElementById('gameUrl');
const addBtn = document.getElementById('addBtn');
const gameList = document.getElementById('gameList');
const videoContainer = document.getElementById('videoContainer'); // Target the container
const evalMask = document.querySelector('.eval-mask');

function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function renderGames() {
    gameList.innerHTML = ''; 
    
    games.forEach((game) => {
        const li = document.createElement('li');
        li.className = 'game-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.innerText = game.name;
        nameSpan.style.flex = "1";
        // Pass the unique game ID to switch
        nameSpan.onclick = () => switchVideo(game.id); 
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>`;
            
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); 
            removeGame(game.id);
        };
        
        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);
        gameList.appendChild(li);
    });
}

function switchVideo(gameId) {
    // 1. Find all our generated iframes
    const allIframes = document.querySelectorAll('.player-iframe');

    // 2. Loop through them, hit PAUSE, and hide them
    allIframes.forEach(iframe => {
        // This line sends a secure command into the iframe telling YouTube to pause
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        iframe.classList.remove('active');
    });

    // 3. Find the exact iframe we want, unhide it, and hit PLAY
    const activeIframe = document.getElementById(`iframe-${gameId}`);
    if (activeIframe) {
        activeIframe.classList.add('active');
        // This line tells the new video to resume playing automatically
        activeIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
}

addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name || !url) return alert("Please enter both a name and a link.");
    
    const videoId = extractVideoId(url);
    if (!videoId) return alert("Invalid YouTube link.");
    
    // Generate a unique ID so we don't mix up identical links
    const uniqueId = Date.now().toString(); 
    
    games.push({ id: uniqueId, name: name, videoId: videoId });
    
    // CREATE THE INVISIBLE IFRAME
    const newIframe = document.createElement('iframe');
    newIframe.id = `iframe-${uniqueId}`;
    newIframe.className = 'player-iframe'; // Tag it so we can find it later
    newIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&enablejsapi=1`;
    newIframe.allow = "autoplay; fullscreen";
    newIframe.referrerPolicy = "strict-origin-when-cross-origin";
    
    // Inject it into the container (it hides behind the mask automatically due to z-index)
    videoContainer.appendChild(newIframe);
    
    // Clear inputs and re-render the sidebar
    nameInput.value = '';
    urlInput.value = '';
    renderGames();
    
    // Automatically switch to the new game
    switchVideo(uniqueId);
    //Show the mask now only when video is playing
    evalMask.style.display = 'block';
});

function removeGame(gameId) {
    // 1. Remove from our array
    games = games.filter(game => game.id !== gameId);
    
    // 2. Find and permanently delete the iframe from the HTML
    const iframeToRemove = document.getElementById(`iframe-${gameId}`);
    if (iframeToRemove) iframeToRemove.remove();
    
    renderGames();
    
    // 3. If there are still games left, switch to the first one so the screen isn't blank
    if (games.length > 0) {
        switchVideo(games[0].id);
    } else {
        //Hide the mask if all games are deleted
        evalMask.style.display = 'none'; 
    }
}

// --- NEW FEATURE: LOAD GLOBAL GAMES --- //

async function loadGlobalGames() {
    try {
        // Fetch the JSON file from the server
        const response = await fetch('games.json');
        
        // If the file exists and loads properly
        if (response.ok) {
            const globalGames = await response.json();
            
            // Loop through each game in the JSON file
            globalGames.forEach(game => {
                const uniqueId = Date.now().toString() + Math.random().toString(36).substr(2, 5); // Extra random string to ensure unique IDs if loading fast
                
                // Add to our local array
                games.push({ id: uniqueId, name: game.name, videoId: game.videoId });
                
                // Create the iframe
                const newIframe = document.createElement('iframe');
                newIframe.id = `iframe-${uniqueId}`;
                newIframe.className = 'player-iframe';
                newIframe.src = `https://www.youtube-nocookie.com/embed/${game.videoId}?autoplay=1&controls=1&enablejsapi=1`;
                newIframe.allow = "autoplay; fullscreen";
                newIframe.referrerPolicy = "strict-origin-when-cross-origin";
                
                videoContainer.appendChild(newIframe);
            });

            // Render the sidebar
            renderGames();
            
            // If we loaded games, show the mask and switch to the first one
            if (games.length > 0) {
                evalMask.style.display = 'block';
                switchVideo(games[0].id);
            }
        }
    } catch (error) {
        console.error("No global games found or error loading them.", error);
    }
}

// Run this function the moment the script loads
loadGlobalGames();