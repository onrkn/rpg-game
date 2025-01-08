import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDice, FaCoins } from 'react-icons/fa';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';

function CoinFlip() {
  const { player, setPlayer } = useGameStore();
  const { showNotification } = useNotification();
  const [betAmount, setBetAmount] = useState(10);
  const [choice, setChoice] = useState('heads');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBetAmountChange = (e) => {
    const amount = parseInt(e.target.value);
    setBetAmount(Math.min(Math.max(amount, 10), 1000));
  };

  const adjustBetAmount = (amount) => {
    const newBetAmount = betAmount + amount;
    setBetAmount(Math.min(Math.max(newBetAmount, 10), 1000));
  };

  const flipCoin = async () => {
    if (loading) return;

    // Bahis kontrolü
    if (betAmount < 10 || betAmount > 1000) {
      showNotification('Bahis 10 ile 1000 altın arasında olmalıdır', 'error');
      return;
    }

    if (player.gold < betAmount) {
      showNotification('Yeterli altın yok', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Önce altını düş
      const { data: updatedPlayerData, error } = await supabase
        .from('players')
        .update({ gold: player.gold - betAmount })
        .eq('id', player.id)
        .select()
        .single();

      if (error) {
        showNotification('İşlem sırasında hata oluştu', 'error');
        return;
      }

      // Lokal state'i güncelle
      setPlayer(updatedPlayerData);

      // Rastgele sonuç üret
      const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
      const isWin = coinResult === choice;

      // Altın hesaplaması
      const newGold = isWin 
        ? updatedPlayerData.gold + betAmount * 2 
        : updatedPlayerData.gold;

      // Supabase'de güncelle
      const { data: updatedPlayerData2, error2 } = await supabase
        .from('players')
        .update({ gold: newGold })
        .eq('id', player.id)
        .select()
        .single();

      if (error2) {
        showNotification('İşlem sırasında hata oluştu', 'error');
        return;
      }

      // Lokal state'i güncelle
      setPlayer(updatedPlayerData2);

      // Sonucu göster
      setResult({
        coinResult,
        isWin,
        goldChange: isWin ? betAmount : -betAmount
      });

      // Bildirim
      showNotification(
        isWin 
          ? `Kazandınız! +${betAmount} altın` 
          : `Kaybettiniz! -${betAmount} altın`, 
        isWin ? 'success' : 'error'
      );

    } catch (err) {
      console.error('Yazı tura hatası:', err);
      showNotification('Bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4"
    >
      <div className="mb-4 bg-gray-700 rounded-lg p-3 flex items-center justify-center">
        <img 
          src="/img/game-coin.png" 
          alt="Altın" 
          className="w-8 h-8 mr-3"
        />
        <span className="text-xl font-bold">{player.gold}</span>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">
          Bahis Miktarı (10-1000 altın)
        </label>
        <div className="flex items-center">
          <div className="flex space-x-2 mr-2">
            <button 
              onClick={() => adjustBetAmount(-100)} 
              className="bg-red-600 text-white px-2 py-1 rounded"
            >
              -100
            </button>
            <button 
              onClick={() => adjustBetAmount(-25)} 
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              -25
            </button>
            <button 
              onClick={() => adjustBetAmount(-10)} 
              className="bg-red-400 text-white px-2 py-1 rounded"
            >
              -10
            </button>
          </div>
          <input 
            type="number" 
            value={betAmount}
            onChange={handleBetAmountChange}
            min="10"
            max="1000"
            className="w-full p-2 bg-gray-700 rounded text-center font-bold text-xl text-yellow-300 border-2 border-gray-600 shadow-inner"
          />
          <div className="flex space-x-2 ml-2">
            <button 
              onClick={() => adjustBetAmount(10)} 
              className="bg-green-400 text-white px-2 py-1 rounded"
            >
              +10
            </button>
            <button 
              onClick={() => adjustBetAmount(25)} 
              className="bg-green-500 text-white px-2 py-1 rounded"
            >
              +25
            </button>
            <button 
              onClick={() => adjustBetAmount(100)} 
              className="bg-green-600 text-white px-2 py-1 rounded"
            >
              +100
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">
          Tahmininiz
        </label>
        <div className="flex space-x-4">
          <button 
            onClick={() => setChoice('heads')}
            className={`px-4 py-2 rounded ${
              choice === 'heads' 
                ? 'bg-green-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Yazı
          </button>
          <button 
            onClick={() => setChoice('tails')}
            className={`px-4 py-2 rounded ${
              choice === 'tails' 
                ? 'bg-green-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Tura
          </button>
        </div>
      </div>

      <button 
        onClick={flipCoin}
        disabled={loading}
        className={`w-full py-3 rounded ${
          loading 
            ? 'bg-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? 'Çevriliyor...' : 'Oyuna Başla'}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="mt-4 text-center"
          >
            <p className="text-xl font-bold">
              {result.isWin ? '🎉 Kazandınız!' : '😢 Kaybettiniz!'}
            </p>
            <p>
              Sonuç: {result.coinResult === 'heads' ? 'Yazı' : 'Tura'}
            </p>
            <p className={result.isWin ? 'text-green-500' : 'text-red-500'}>
              {result.isWin ? '+' : ''}{result.goldChange} Altın
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Blackjack() {
  const { player, setPlayer } = useGameStore();
  const { showNotification } = useNotification();
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState('betting');
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState(0);

  // Kart değerlerini hesapla
  const calculateHandValue = (hand) => {
    let value = 0;
    let aceCount = 0;

    hand.forEach(card => {
      if (card.value === 'A') {
        aceCount++;
        value += 11;
      } else if (['K', 'Q', 'J'].includes(card.value)) {
        value += 10;
      } else {
        value += parseInt(card.value);
      }
    });

    // Aşırı değeri düzelt
    while (value > 21 && aceCount > 0) {
      value -= 10;
      aceCount--;
    }

    return value;
  };

  // Deste oluştur
  const createDeck = () => {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const newDeck = [];

    suits.forEach(suit => {
      values.forEach(value => {
        newDeck.push({ suit, value });
      });
    });

    // Kartları karıştır
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    return newDeck;
  };

  // Oyunu başlat
  const startGame = async () => {
    if (player.gold < betAmount) {
      showNotification('Yeterli altın yok', 'error');
      return;
    }

    try {
      // Önce altını düş
      const { data: updatedPlayerData, error } = await supabase
        .from('players')
        .update({ gold: player.gold - betAmount })
        .eq('id', player.id)
        .select()
        .single();

      if (error) {
        showNotification('İşlem sırasında hata oluştu', 'error');
        return;
      }

      // Lokal state'i güncelle
      setPlayer(updatedPlayerData);

      const newDeck = createDeck();
      const initialPlayerHand = [newDeck.pop(), newDeck.pop()];
      const initialDealerHand = [newDeck.pop(), newDeck.pop()];

      setDeck(newDeck);
      setPlayerHand(initialPlayerHand);
      setDealerHand(initialDealerHand);
      setGameState('playing');
      setRevealedCards(0);

    } catch (err) {
      console.error('Blackjack hatası:', err);
      showNotification('Bir hata oluştu', 'error');
    }
  };

  // Kart çek
  const hit = () => {
    // Oyun zaten bittiyse işlem yapma
    if (gameState !== 'playing') return;

    const newHand = [...playerHand];
    const newCard = deck.pop();
    newHand.push(newCard);
    
    setPlayerHand(newHand);
    setDeck(deck.filter(card => card !== newCard));

    // Kart çektikten sonra değeri hesapla
    const newValue = calculateHandValue(newHand);
    
    // 21'i geçerse DERHAL kaybeder
    if (newValue > 21) {
      // Direkt olarak oyunu bitir ve kaybet
      endGame('lose');
    }
  };

  // Oyunu sonlandır
  const endGame = async (result) => {
    // Oyun zaten bittiyse tekrar işlem yapma
    if (gameState !== 'playing') return;

    setLoading(true);
    setGameState(result);
    setRevealedCards(0); // Dealer kartları açılmasın

    let goldChange = 0;
    
    if (result === 'lose') {
      goldChange = 0; // Bahis zaten düşülmüş
      showNotification('Kaybettiniz! Eliniz 21\'i geçti', 'error');
    } else if (result === 'win') {
      goldChange = betAmount * 2;
      showNotification(`Kazandınız! +${betAmount} altın`, 'success');
    } else if (result === 'draw') {
      goldChange = betAmount;
      showNotification(`Berabere! Bahsiniz (${betAmount} altın) iade edildi`, 'info');
    }

    try {
      // Altın güncellemesi
      const newGold = player.gold + goldChange;
      const { data: updatedPlayerData, error } = await supabase
        .from('players')
        .update({ gold: newGold })
        .eq('id', player.id)
        .select()
        .single();

      if (error) {
        showNotification('İşlem sırasında hata oluştu', 'error');
      } else {
        setPlayer(updatedPlayerData);
      }
    } catch (err) {
      console.error('Blackjack hatası:', err);
      showNotification('Bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Duruşu tamamla
  const stand = async () => {
    // Oyun zaten bittiyse işlem yapma
    if (gameState !== 'playing') return;

    setLoading(true);
    
    // Sonucu hesapla
    const playerValue = calculateHandValue(playerHand);
    const currentDealerHand = [...dealerHand];

    // 21'i geçerse DERHAL kaybeder
    if (playerValue > 21) {
      endGame('lose');
      return;
    }

    // Dealer 17'nin altındaysa kart çekmeye devam et
    while (calculateHandValue(currentDealerHand) < 17) {
      const newCard = deck.pop();
      currentDealerHand.push(newCard);
    }

    setDealerHand(currentDealerHand);
    setDeck(deck);

    const dealerFinalValue = calculateHandValue(currentDealerHand);

    // Kazanma/Kaybetme/Berabere durumlarını belirle
    let result = 'draw';
    if (dealerFinalValue > 21) {
      result = 'win';
    } else if (playerValue > dealerFinalValue) {
      result = 'win';
    } else if (playerValue < dealerFinalValue) {
      result = 'lose';
    }

    // Kartları yavaş yavaş aç
    const revealDealerCards = () => {
      return new Promise(resolve => {
        const interval = setInterval(() => {
          setRevealedCards(prev => {
            if (prev >= currentDealerHand.length - 1) {
              clearInterval(interval);
              resolve();
            }
            return prev + 1;
          });
        }, 500);
      });
    };

    // Dealer kartlarını aç
    await revealDealerCards();

    // 2 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Oyunu sonlandır
    endGame(result);
  };

  // Yeni oyun
  const resetGame = () => {
    setGameState('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setRevealedCards(0);
  };

  const handleBetAmountChange = (e) => {
    const amount = parseInt(e.target.value);
    setBetAmount(Math.min(Math.max(amount, 10), 1000));
  };

  const adjustBetAmount = (amount) => {
    const newBetAmount = betAmount + amount;
    setBetAmount(Math.min(Math.max(newBetAmount, 10), 1000));
  };

  // Kart görselini oluştur
  const renderCard = (card, hidden = false, key) => {
    if (hidden) {
      return (
        <motion.div
          key={key}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: hidden ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-700 rounded-lg w-16 h-24 flex items-center justify-center m-1 transform rotate-2"
        >
          <span className="text-gray-400">🂠</span>
        </motion.div>
      );
    }

    const cardColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-black';
    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, rotateY: 180 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.5 }}
        className={`bg-white rounded-lg w-16 h-24 flex flex-col items-center justify-center m-1 ${cardColor}`}
      >
        <span className="text-2xl font-bold">{card.value}</span>
        <span className="text-xl">{card.suit}</span>
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4"
    >
      <div className="mb-4 bg-gray-700 rounded-lg p-3 flex items-center justify-center">
        <img 
          src="/img/game-coin.png" 
          alt="Altın" 
          className="w-8 h-8 mr-3"
        />
        <span className="text-xl font-bold">{player.gold}</span>
      </div>

      {gameState === 'betting' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Bahis Miktarı (10-1000 altın)
            </label>
            <div className="flex items-center">
              <div className="flex space-x-2 mr-2">
                <button 
                  onClick={() => adjustBetAmount(-100)} 
                  className="bg-red-600 text-white px-2 py-1 rounded"
                >
                  -100
                </button>
                <button 
                  onClick={() => adjustBetAmount(-25)} 
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  -25
                </button>
                <button 
                  onClick={() => adjustBetAmount(-10)} 
                  className="bg-red-400 text-white px-2 py-1 rounded"
                >
                  -10
                </button>
              </div>
              <input 
                type="number" 
                value={betAmount}
                onChange={handleBetAmountChange}
                min="10"
                max="1000"
                className="w-full p-2 bg-gray-700 rounded text-center font-bold text-xl text-yellow-300 border-2 border-gray-600 shadow-inner"
              />
              <div className="flex space-x-2 ml-2">
                <button 
                  onClick={() => adjustBetAmount(10)} 
                  className="bg-green-400 text-white px-2 py-1 rounded"
                >
                  +10
                </button>
                <button 
                  onClick={() => adjustBetAmount(25)} 
                  className="bg-green-500 text-white px-2 py-1 rounded"
                >
                  +25
                </button>
                <button 
                  onClick={() => adjustBetAmount(100)} 
                  className="bg-green-600 text-white px-2 py-1 rounded"
                >
                  +100
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-700"
          >
            Oyuna Başla
          </button>
        </>
      )}

      {gameState === 'playing' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold mb-2">Dağıtıcı (Dealer)</h3>
            <div className="flex">
              {dealerHand.map((card, index) => 
                index <= revealedCards 
                  ? renderCard(card, false, `dealer-card-${index}`) 
                  : renderCard(card, true, `dealer-card-hidden-${index}`)
              )}
              <div className="ml-2 text-sm">
                Puan: {calculateHandValue(dealerHand.slice(0, revealedCards + 1))}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-bold mb-2">Oyuncu</h3>
            <div className="flex">
              {playerHand.map((card, index) => renderCard(card, false, `player-card-${index}`))}
              <div className="ml-2 text-sm">
                Puan: {calculateHandValue(playerHand)}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button 
              onClick={hit}
              disabled={loading}
              className="flex-1 py-3 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              Kart Al
            </button>
            <button 
              onClick={stand}
              disabled={loading}
              className="flex-1 py-3 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Dur
            </button>
          </div>
        </div>
      )}

      {['win', 'lose', 'draw'].includes(gameState) && (
        <div className="text-center">
          <p className="text-2xl font-bold mb-4">
            {gameState === 'win' && '🎉 Kazandınız!'}
            {gameState === 'lose' && '😢 Kaybettiniz!'}
            {gameState === 'draw' && '🤝 Berabere!'}
          </p>
          <button 
            onClick={resetGame}
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-700"
          >
            Tekrar Oyna
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ScratchCard() {
  const { player, setPlayer } = useGameStore();
  const { showNotification } = useNotification();
  const [cards, setCards] = useState([]);
  const [gameState, setGameState] = useState('ready');
  const [winAmount, setWinAmount] = useState(0);

  // Olası ödüller
  const PRIZES = [
    { amount: 5, count: 0, weight: 30 },
    { amount: 10, count: 0, weight: 20 },
    { amount: 25, count: 0, weight: 15 },
    { amount: 50, count: 0, weight: 10 },
    { amount: 100, count: 0, weight: 5 },
    { amount: 500, count: 0, weight: 5 },
    { amount: 1000, count: 0, weight: 2.5 },
    { amount: 2000, count: 0, weight: 1 },
    { amount: 5000, count: 0, weight: 0.5 },
    { amount: 10000, count: 0, weight: 0.1 }
  ];

  // Rastgele ödül seç
  const selectRandomPrize = () => {
    // Her ödül türünden maksimum 3 tane çıkabilir
    const availablePrizes = PRIZES.filter(prize => prize.count < 3);
    
    if (availablePrizes.length === 0) {
      // Eğer tüm ödüller doluysa, en düşük ödülü seç
      return PRIZES[PRIZES.length - 1].amount;
    }

    // Ağırlıklı seçim
    const totalWeight = availablePrizes.reduce((sum, prize) => sum + prize.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const prize of availablePrizes) {
      random -= prize.weight;
      if (random <= 0) {
        prize.count++;
        return prize.amount;
      }
    }

    // Güvenlik için son ödülü seç
    availablePrizes[availablePrizes.length - 1].count++;
    return availablePrizes[availablePrizes.length - 1].amount;
  };

  // Oyunu başlat
  const startGame = async () => {
    // Bahis kontrolü
    if (player.gold < 10) {
      showNotification('Yeterli altın yok', 'error');
      return;
    }

    // Ödül sayaçlarını sıfırla
    PRIZES.forEach(prize => prize.count = 0);

    // 6 kartlık yeni bir oyun oluştur
    const newCards = Array.from({ length: 6 }, () => {
      const prize = selectRandomPrize();
      return { prize, scratched: false };
    });

    setCards(newCards);
    setGameState('playing');
    setWinAmount(0);
  };

  // Kartı kazı
  const scratchCard = (index) => {
    if (gameState !== 'playing' || cards[index].scratched) return;

    const updatedCards = [...cards];
    updatedCards[index].scratched = true;
    setCards(updatedCards);

    // Kazanma kontrolü
    const scratchedCards = updatedCards.filter(card => card.scratched);
    if (scratchedCards.length === 6) {
      // 2 saniye bekle sonra kontrol et
      setTimeout(() => {
        checkWinCondition(updatedCards);
      }, 2000);
    }
  };

  // Kazanma durumunu kontrol et
  const checkWinCondition = async (updatedCards) => {
    // Aynı miktarda en az 3 ödül var mı?
    const prizeCounts = {};
    updatedCards.forEach(card => {
      prizeCounts[card.prize] = (prizeCounts[card.prize] || 0) + 1;
    });

    let winningAmount = 0;
    for (const [prize, count] of Object.entries(prizeCounts)) {
      if (count === 3) {
        winningAmount = parseInt(prize);
        break;
      }
    }

    setWinAmount(winningAmount);

    // Supabase'de güncelle
    try {
      // Önce altını ekle
      const { data: updatedPlayerData, error } = await supabase
        .from('players')
        .update({ gold: player.gold + winningAmount })
        .eq('id', player.id)
        .select()
        .single();

      if (error) {
        showNotification('İşlem sırasında hata oluştu', 'error');
        return;
      }

      // Lokal state'i güncelle
      setPlayer(updatedPlayerData);

      // Sonucu göster
      setGameState('finished');
      showNotification(
        winningAmount > 0 
          ? `Kazandınız! +${winningAmount} altın` 
          : 'Maalesef kazanamadınız',
        winningAmount > 0 ? 'success' : 'error'
      );
    } catch (err) {
      console.error('Kazı Kazan hatası:', err);
      showNotification('Bir hata oluştu', 'error');
    }
  };

  // Kartları sıfırla
  const resetGame = () => {
    setGameState('ready');
    setCards([]);
    setWinAmount(0);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4"
    >
      <div className="mb-4 bg-gray-700 rounded-lg p-3 flex items-center justify-center">
        <img 
          src="/img/game-coin.png" 
          alt="Altın" 
          className="w-8 h-8 mr-3"
        />
        <span className="text-xl font-bold">{player.gold}</span>
      </div>

      {gameState === 'ready' && (
        <div>
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold mb-2">Kazı Kazan</h2>
            <p className="text-sm text-gray-400 mb-4">
              6 karttan en az 3'ünde aynı ödülü kazanın!
            </p>
            <div className="bg-gray-800 p-3 rounded-lg mb-4">
              <p>Oyun Ücreti: <span className="text-yellow-400">10 Altın</span></p>
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg mb-4">
              <h3 className="text-lg font-bold mb-2 text-green-400">Kazanma Olasılıkları</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-yellow-400">5 Altın:</span> %30
                </div>
                <div>
                  <span className="text-yellow-400">10 Altın:</span> %20
                </div>
                <div>
                  <span className="text-yellow-400">25 Altın:</span> %15
                </div>
                <div>
                  <span className="text-yellow-400">50 Altın:</span> %10
                </div>
                <div>
                  <span className="text-yellow-400">100 Altın:</span> %5
                </div>
                <div>
                  <span className="text-yellow-400">500 Altın:</span> %5
                </div>
                <div>
                  <span className="text-yellow-400">1.000 Altın:</span> %2.5
                </div>
                <div>
                  <span className="text-yellow-400">2.000 Altın:</span> %1
                </div>
                <div>
                  <span className="text-yellow-400">5.000 Altın:</span> %0.5
                </div>
                <div>
                  <span className="text-red-400 font-bold">10.000 Altın:</span> %0.1
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 italic">
                🌟 10.000 Altın kazanma şansı çok düşük ama imkansız değil!
              </p>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-700"
          >
            Oyuna Başla
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {cards.map((card, index) => (
              <motion.div
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => scratchCard(index)}
                className={`aspect-square bg-gray-700 rounded-lg flex items-center justify-center 
                  ${card.scratched ? 'bg-green-700' : 'hover:bg-gray-600 cursor-pointer'}
                  transition-colors duration-300`}
              >
                {card.scratched ? (
                  <span className="text-2xl font-bold text-white">
                    {card.prize} 
                    <span className="text-sm ml-1">Altın</span>
                  </span>
                ) : (
                  <span className="text-gray-400 text-lg">Kazı</span>
                )}
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400">
            En az 3 karttan aynı ödülü kazanın!
          </p>
        </div>
      )}

      {gameState === 'finished' && (
        <div className="text-center">
          <p className="text-2xl font-bold mb-4">
            {winAmount > 0 
              ? `🎉 Kazandınız! ${winAmount} Altın` 
              : '😢 Maalesef kazanamadınız'}
          </p>
          <button 
            onClick={resetGame}
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-700"
          >
            Tekrar Oyna
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Casino() {
  const [activeTab, setActiveTab] = useState('coinflip');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-700 rounded-t-2xl">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('coinflip')}
            className={`flex-1 py-3 flex items-center justify-center space-x-2 ${
              activeTab === 'coinflip' 
                ? 'bg-blue-600 text-white rounded-none' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 rounded-none'
            }`}
          >
            <FaCoins />
            <span>Yazı Tura</span>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('blackjack')}
            className={`flex-1 py-3 flex items-center justify-center space-x-2 ${
              activeTab === 'blackjack' 
                ? 'bg-blue-600 text-white rounded-none' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 rounded-none'
            }`}
          >
            <FaDice />
            <span>Blackjack</span>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('scratchcard')}
            className={`flex-1 py-3 flex items-center justify-center space-x-2 ${
              activeTab === 'scratchcard' 
                ? 'bg-blue-600 text-white rounded-none' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 rounded-none'
            }`}
          >
            <FaDice />
            <span>Kazı Kazan</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {activeTab === 'coinflip' && <CoinFlip key="coinflip" />}
          {activeTab === 'blackjack' && <Blackjack key="blackjack" />}
          {activeTab === 'scratchcard' && <ScratchCard key="scratchcard" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default React.memo(Casino);
