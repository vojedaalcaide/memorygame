function Memory(options, callbacks) {

  var base = this;

  // default options (to be setted by constructor)
  defaultOptions = {
    // numCards: 20
  };

  base.cards = [];
  base.cardsPaired = []; // true --> cards user has paired

  // options validations
  if (!options) {
    console.error('No `options` received as parameter');
  } else {
    if (!options.numCards
      || typeof options.numCards !== 'number'
      || options.numCards % 2 !== 0
    ) {
      console.error('`options.numCards` not defined or not a valid number when initializing Memory');
      return;
    }
  }

  // set configuration from
  this.config = Object.assign({}, defaultOptions, options);

  this.init = function () {
    this.generateRandomCards();
  }

  this.generateRandomCards = function () {

    // create empty arrays
    let tempArray = [];
    let len = base.config.numCards;
    while (len > 0) {
      tempArray.push(undefined);
      base.cardsPaired.push(false);
      len--;
    }
    // fill array with random values
    let cardsFilled = 0;
    let numbersToGive = base.config.numCards;
    while (numbersToGive > 0) {
      tempArray[numbersToGive - 1] = Math.round(numbersToGive/2);
      numbersToGive--;
    }
    base.cards = _.shuffle(tempArray);
  }

  this.checkWinCondition = function() {
    const gameFinished = !base.cardsPaired.filter(c => !c).length;
    if (gameFinished) {
      setTimeout(() => {
        callbacks.gameWin();
      }, 1);
    }
  }

  this.getConfig = function() {
    return JSON.parse(JSON.stringify(base.config));
  }

  this.getCardValue = function(cardIndex) {
    return base.cards[cardIndex];
  }

  this.checkPair = function(indexCard1, indexCard2) {
    const pairCheck = base.cards[indexCard1] === base.cards[indexCard2];
    if (pairCheck) {
      base.cardsPaired[indexCard1] = true;
      base.cardsPaired[indexCard2] = true;
    }
    base.checkWinCondition();
    return pairCheck;
  }  

  // initialize logic
  this.init();

  // visible properties from outside
  return {
    getConfig: base.getConfig,
    getCardValue: base.getCardValue,
    checkPair: base.checkPair
  };
}