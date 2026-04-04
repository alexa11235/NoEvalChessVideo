let games = [];
let allGlobalGames = [];

const nameInput = document.getElementById('gameName');
const urlInput = document.getElementById('gameUrl');
const addBtn = document.getElementById('addBtn');
const gameList = document.getElementById('gameList');
const videoContainer = document.getElementById('videoContainer');
const evalMask = document.querySelector('.eval-mask');
const customFsBtn = document.getElementById('customFsBtn');
const roundSelect = document.getElementById('roundSelect');
const sidebarWrapper = document.getElementById('sidebarWrapper');
const sidebarToggle = document.getElementById('sidebarToggle');
let idleTimer;

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
        // Replaces dashes with line breaks
        const formattedName = game.name.replace(/\s*[-—]\s*/g, '<br>');
        nameSpan.innerHTML = formattedName;
        nameSpan.style.flex = "1";
        nameSpan.onclick = () => switchVideo(game.id); 
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            
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
        
        evalMask.style.display = 'block';
        customFsBtn.style.display = 'flex';
        
        // Trigger the idle timer as soon as the video switches
        wakeUpControls();
    }
}

function clearCurrentGames() {
    games = [];
    document.querySelectorAll('.player-iframe').forEach(iframe => iframe.remove());
    evalMask.style.display = 'none';
    customFsBtn.style.display = 'none';
    renderGames();
}

function loadSelectedCategory(category, targetRound) {
    clearCurrentGames();

    const filtered = allGlobalGames.filter(game => {
        const matchesRound = game.round === targetRound;
        if (category === 'all') return matchesRound;
        return matchesRound && game.category.toLowerCase() === category;
    });

    filtered.forEach(game => {
        const uniqueId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        games.push({ id: uniqueId, name: game.name, videoId: game.videoId });
        
        const newIframe = document.createElement('iframe');
        newIframe.id = `iframe-${uniqueId}`;
        newIframe.className = 'player-iframe';
        newIframe.src = `https://www.youtube-nocookie.com/embed/${game.videoId}?autoplay=1&controls=1&enablejsapi=1`;
        newIframe.allow = "autoplay"; 
        newIframe.referrerPolicy = "strict-origin-when-cross-origin";
        videoContainer.appendChild(newIframe);
    });

    renderGames();
    if (games.length > 0) switchVideo(games[0].id);
}

async function initGlobalData() {
    try {
        const response = await fetch('games.json');
        if (response.ok) {
            allGlobalGames = await response.json();
            if (allGlobalGames.length === 0) return;

            // Safely find the highest round number in the JSON file
            const currentRound = Math.max(...allGlobalGames.map(g => g.round));
            
            roundSelect.innerHTML = `
                <option value="" disabled selected hidden>Load Games</option>
                <option value="open">Round ${currentRound} - Open</option>
                <option value="women">Round ${currentRound} - Women</option>
                <option value="all">Round ${currentRound} - All</option>
            `;

            roundSelect.addEventListener('change', (e) => {
                loadSelectedCategory(e.target.value, currentRound);
            });
        }
    } catch (error) {
        console.error("JSON Error", error);
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
    videoContainer.appendChild(newIframe);
    
    nameInput.value = ''; urlInput.value = '';
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
        evalMask.style.display = 'none'; 
        customFsBtn.style.display = 'none';
    }
}

initGlobalData();

// --- SIDEBAR TOGGLE --- //
sidebarToggle.addEventListener('click', () => {
    sidebarWrapper.classList.toggle('collapsed');
});

// --- FULLSCREEN LOGIC --- //
function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
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

// --- YOUTUBE-STYLE IDLE TIMER --- //
function wakeUpControls() {
    if (evalMask.style.display === 'block') {
        customFsBtn.classList.remove('fade-out');
        clearTimeout(idleTimer);
        
        idleTimer = setTimeout(() => {
            customFsBtn.classList.add('fade-out');
        }, 2500); 
    }
}

videoContainer.addEventListener('mousemove', wakeUpControls);

videoContainer.addEventListener('mouseleave', () => {
    clearTimeout(idleTimer);
    customFsBtn.classList.add('fade-out');
});
