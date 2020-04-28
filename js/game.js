const PAIRS_NUMBER = 12;
const TIME_CHECKING_CARDS = 1250;

const ID_GAME_CONTAINER = 'gameContainer';
const ID_INFO_PAIRS_COMPETED = 'pairsCompleted';
const ID_INFO_PAIRS_REMAINING = 'pairsRemaining';
const ID_INFO_NUM_ATTEMPTS = 'numAttemps';
const ID_VICTORY = 'victory';

const CLASS_CARD_FLIPPED = 'flipped';
const CLASS_CARD = 'memory-card';
const CLASS_CARD_PAIRED = 'paired';

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

// main execution when document loads
$(document).ready(function () {
  resetGame();
});

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
  this.updateInfoPanel();
  this.resetCards();
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
      unflipCards(cardsFlipped);
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

function unflipCards(arrayIds) {
  arrayIds.forEach(cardId => {
    const $cardEl = $('#card_' + cardId);
    $('.card-inner', $cardEl).removeClass(CLASS_CARD_FLIPPED);
    setTimeout(() => {
      $('.card-back-value', $cardEl)[0].innerText = '';
    }, 300);
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
