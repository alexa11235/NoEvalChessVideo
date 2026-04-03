let games = [];
const nameInput = document.getElementById('gameName');
const urlInput = document.getElementById('gameUrl');
const addBtn = document.getElementById('addBtn');
const gameList = document.getElementById('gameList');
const videoContainer = document.getElementById('videoContainer');
const evalMask = document.querySelector('.eval-mask');
const customFsBtn = document.getElementById('customFsBtn');
let allGlobalGames = []; 
const roundSelect = document.getElementById('roundSelect');

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
    const allIframes = document.querySelectorAll('.player-iframe');
    allIframes.forEach(iframe => {
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
        iframe.classList.remove('active');
    });

    const activeIframe = document.getElementById(`iframe-${gameId}`);
    if (activeIframe) {
        activeIframe.classList.add('active');
        if (activeIframe.contentWindow) {
            activeIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        }
        
        // SHOW UI ELEMENTS: Only when a video is actually activated
        evalMask.style.display = 'block';
        customFsBtn.style.display = 'flex';
    }
}

addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url) return alert("Please enter both a name and a link.");
    const videoId = extractVideoId(url);
    if (!videoId) return alert("Invalid YouTube link.");
    
    const uniqueId = Date.now().toString(); 
    games.push({ id: uniqueId, name: name, videoId: videoId });
    
    const newIframe = document.createElement('iframe');
    newIframe.id = `iframe-${uniqueId}`;
    newIframe.className = 'player-iframe';
    newIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&enablejsapi=1`;
    newIframe.allow = "autoplay"; 
    newIframe.referrerPolicy = "strict-origin-when-cross-origin";
    videoContainer.appendChild(newIframe);
    
    nameInput.value = '';
    urlInput.value = '';
    renderGames();
    switchVideo(uniqueId);
});

function removeGame(gameId) {
    games = games.filter(game => game.id !== gameId);
    const iframeToRemove = document.getElementById(`iframe-${gameId}`);
    if (iframeToRemove) iframeToRemove.remove();
    
    renderGames();
    
    if (games.length > 0) {
        switchVideo(games[0].id);
    } else {
        // HIDE UI ELEMENTS: If there are no games left
        evalMask.style.display = 'none'; 
        customFsBtn.style.display = 'none';
    }
}

async function initGlobalData() {
    try {
        const response = await fetch('games.json');
        if (response.ok) {
            allGlobalGames = await response.json();
            if (allGlobalGames.length === 0) return;

            // Find the round number from the first game in your JSON
            const currentRound = allGlobalGames[0].round;
            
            // Build your 3 specific options using that number
           roundSelect.innerHTML = `
                <option value="open">Round ${currentRound} - Open</option>
                <option value="women">Round ${currentRound} - Women</option>
                <option value="all">Round ${currentRound} - All</option>
            `;

            // Make the menu actually do something when clicked
            roundSelect.addEventListener('change', (e) => {
                loadSelectedCategory(e.target.value, currentRound);
            });
        }
    } catch (error) {
        console.error("JSON not found.");
    }
}

function loadSelectedCategory(category, targetRound) {
    // 1. Clear current games and iframes
    games = [];
    document.querySelectorAll('.player-iframe').forEach(f => f.remove());
    
    // 2. Filter from the JSON
    const filtered = allGlobalGames.filter(g => {
        if (category === 'all') return g.round === targetRound;
        return g.round === targetRound && g.category.toLowerCase() === category;
    });

    // 3. Create the iframes (using your existing logic)
    filtered.forEach(game => {
        const uniqueId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        games.push({ id: uniqueId, name: game.name, videoId: game.videoId });
        const newIframe = document.createElement('iframe');
        newIframe.id = `iframe-${uniqueId}`;
        newIframe.className = 'player-iframe';
        newIframe.src = `https://www.youtube-nocookie.com/embed/${game.videoId}?autoplay=1&controls=1&enablejsapi=1`;
        newIframe.allow = "autoplay"; 
        videoContainer.appendChild(newIframe);
    });

    renderGames();
    if (games.length > 0) switchVideo(games[0].id);
}

initGlobalData();

// --- FULLSCREEN LOGIC --- //
function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

customFsBtn.addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', handleFsChange);
document.addEventListener('webkitfullscreenchange', handleFsChange);

function handleFsChange() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        document.body.classList.add('is-fullscreen');
    } else {
        document.body.classList.remove('is-fullscreen');
    }
}
