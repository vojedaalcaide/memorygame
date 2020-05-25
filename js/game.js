const PAIRS_NUMBER = 12;
const TIME_CHECKING_CARDS = 1250;

const DEFAULT_USER_PLAYER = 'Anónimo'

// Elements ID
const ID_GAME_CONTAINER = 'gameContainer';
const ID_INFO_PAIRS_COMPETED = 'pairsCompleted';
const ID_INFO_PAIRS_REMAINING = 'pairsRemaining';
const ID_INFO_NUM_ATTEMPTS = 'numAttemps';
const ID_VICTORY = 'victory';
const ID_PLAYER_SELECT = 'playerSelect';
const ID_NEW_PLAYER_BUTTON = 'newPlayerBtn';
const ID_ADD_PLAYER_CONTAINER = 'addPlayerContainer';
const ID_NEW_PLAYER_NAME = 'newPlayerName';
const ID_ADD_PLAYER_OK_BUTTON = 'addPlayerOkBtn';
const ID_ADD_PLAYER_CANCEL_BUTTON = 'addPlayerCancelBtn';

// CSS classes
const CLASS_CARD_FLIPPED = 'flipped';
const CLASS_CARD = 'memory-card';
const CLASS_CARD_PAIRED = 'paired';

// LocalStorage keys
const LOCALSTORAGE_PLAYERS = 'players';

var memory = null; // instance of Memory

// array of index cards that have been flipped.
// Only 2 will be allowed before doing a pair check
var cardsFlipped = [];

// array of cards already paired (cards not usable anymore)
var cardsPaired = [];

// semaphore to lock/unlock card click handler
var handlerLocked = false;

// number of attempts from beggining
var numAttempts = 0;
var remainingPairs = 0;

// flag to know when the game has finished and user has won
var win = false;

// players data
var playersData = {};

// main execution when document loads
$(document).ready(function () {
  chargePlayers();
  // setPlayersListeners();
  resetGame();
});

function chargePlayers() {
  const _playersData = getPlayersInfo();
  /* PlayersInfo comes this format:
  {
    lastPlayer: string,
    players: Array of:
      { username: string, bestScore: number, totalScore: number, numGames: number }
  }
  */
  if (!Array.isArray(_playersData.players) || _playersData.length === 0) {
    _playersData.players = [];
    _playersData.players.push({
      username: DEFAULT_USER_PLAYER,
      bestScore: 0,
      totalScore: 0,
      numGames: 0
    });
    _playersData.lastPlayer = DEFAULT_USER_PLAYER;
  }
  playersData = _playersData;
}

function setPlayersListeners() {
  const $select = $('#' + ID_PLAYER_SELECT);
  const $newPlayerBtn = $('#' + ID_NEW_PLAYER_BUTTON);
  const $addPlayerOkBtn = $('#' + ID_ADD_PLAYER_OK_BUTTON);
  const $addPlayerCancelBtn = $('#' + ID_ADD_PLAYER_CANCEL_BUTTON);
  const $addPlayerName = $('#' + ID_NEW_PLAYER_NAME);
  const $addPlayerContainer = $('#' + ID_ADD_PLAYER_CONTAINER);

  $select.on('change', (ev) => {
    playersData.lastPlayer = ev.target.value;
    resetGame();
  });

  $newPlayerBtn.on('click', (ev) => {
    $addPlayerContainer.show();
    $addPlayerName[0].value = '';
    $addPlayerName.focus();
  });

  $addPlayerOkBtn.on('click', (ev) => {
    const newUsername = ($addPlayerName[0].value || '').trim();
    if (newUsername.length) {
      const usernamesList = playersData.players.map(pl => pl.username);
      if (usernamesList.indexOf(newUsername) !== -1) {
        alert('Este nombre de jugdor ya existe!');
      } else {
        addNewPlayer(newUsername);
        resetGame();
      }
    }
  });
  $addPlayerCancelBtn.on('click', (ev) => {
    $addPlayerContainer.hide();
  });
}

function addNewPlayer(username) {
  playersData.players.push({
    username,
    bestScore: 0,
    totalScore: 0,
    numGames: 0
  });
  playersData.lastPlayer = username;
  savePlayersInfo(playersData);
}

function resetGame() {
  memory = null;
  memory = new Memory(
    // configuration
    {
      numCards: PAIRS_NUMBER*2
    },
    // callbacks
    {
      gameWin: onGameWin
    }
  );

  cardsFlipped = [];
  cardsPaired = [];
  numAttempts = 0;
  remainingPairs = 0;
  win = false;

  resetUI();
}

function resetUI() {
  updateInfoPanel();
  // updatePlayersPanel();
  resetCards();
}

function updatePlayersPanel() {
  const $playersSelect = $('#'+ ID_PLAYER_SELECT);
  const usernamesList = playersData.players.map(pl => pl.username);

  $playersSelect.empty();
  usernamesList.forEach(user => $playersSelect.append(
    '<option value="' + user + '">' + user + '</option>'
  ));

  if (!playersData.lastPlayer) {
    playersData.lastPlayer = usernamesList[0];
  }
  $('option[value="' + playersData.lastPlayer + '"', $playersSelect).prop('selected', true);
  
  $('#' + ID_ADD_PLAYER_CONTAINER).hide();
}

function updateInfoPanel() {
  const numPairs = Math.floor(cardsPaired.length/2);
  remainingPairs = PAIRS_NUMBER - numPairs;
  $('#' + ID_INFO_PAIRS_COMPETED)[0].innerText = '' + numPairs;
  $('#' + ID_INFO_PAIRS_REMAINING)[0].innerText = '' + PAIRS_NUMBER;
  $('#' + ID_INFO_NUM_ATTEMPTS)[0].innerText = '' + numAttempts;
  win ? $('#' + ID_VICTORY).show() : $('#' + ID_VICTORY).hide();
}

function resetCards() {
  const $gameContainer = $('#'+ID_GAME_CONTAINER).empty();

  unbindAllCardsListeners();

  for (let i = 0; i < PAIRS_NUMBER*2; i++) {
    $gameContainer.append(
      '<div class="memory-card" id="card_' + i + '">' +
        '<div class="card-inner">' +
          '<div class="card-front">' +
            '<div class="card-front-content"></div>' +
          '</div>' +
          '<div class="card-back">' +
            '<div class="card-back-content">' +
              '<span class="card-back-value"></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  bindAllCardsListeners();
}

function bindAllCardsListeners() {
  $('.' + CLASS_CARD).on('click', onCardClick);
}

function unbindAllCardsListeners() {
  $('.' + CLASS_CARD).off('click', onCardClick);
}

async function onCardClick(ev) {
  // if handler locked, skip
  if (handlerLocked) {
    return;
  }
  handlerLocked = true;

  const $cardEl = $(this);
  const cardId = parseInt($cardEl[0].id.split('_')[1]);

  // if card already flipped, skip
  if (cardsFlipped.indexOf(cardId) !== -1) {
    handlerLocked = false;
    return;
  }
  // if card already paired, skip
  if (cardsPaired.indexOf(cardId) !== -1) {
    handlerLocked = false;
    return;
  }

  // card is available to play
  cardsFlipped.push(cardId);
  $('.card-back-value', $cardEl)[0].innerText = '' + memory.getCardValue(cardId);
  $('.card-inner', $cardEl).addClass(CLASS_CARD_FLIPPED);

  // if 2 cards flipped, check equality
  if (cardsFlipped.length >= 2) {
    await waitTime(TIME_CHECKING_CARDS/2);
    numAttempts++;
    updateInfoPanel();
    if (memory.checkPair(cardsFlipped[0], cardsFlipped[1])) {
      cardsPaired.push(...cardsFlipped);
      lockCards(cardsFlipped);
      updateInfoPanel(cardsFlipped);
    } else {
      await waitTime(TIME_CHECKING_CARDS/2);
      await unflipCards(cardsFlipped);
    }
    cardsFlipped = [];
  }
  handlerLocked = false;
}

function lockCards(arrayIds) {
  arrayIds.forEach(cardId => {
    const $cardEl = $('#card_' + cardId);
    $cardEl.addClass(CLASS_CARD_PAIRED);
  });
}

async function unflipCards(arrayIds) {
  arrayIds.forEach(async cardId => {
    const $cardEl = $('#card_' + cardId);
    $('.card-inner', $cardEl).removeClass(CLASS_CARD_FLIPPED);
    await waitTime(300);
    $('.card-back-value', $cardEl)[0].innerText = '';
  });
}

function waitTime(ms) { // milliseconds to wait
  return new Promise(res => _.delay(res, ms));
}

// callback called when user wins the game
function onGameWin() {
  unbindAllCardsListeners();
  win = true;
  updateInfoPanel();
  console.log('Win!');
}

function getPlayersInfo() {
  let playersInfo = window.localStorage.getItem(LOCALSTORAGE_PLAYERS) || '{}';
  return JSON.parse(playersInfo);
}

function savePlayersInfo(playersInfo) {
  window.localStorage.setItem(LOCALSTORAGE_PLAYERS, JSON.stringify(playersInfo));
}
