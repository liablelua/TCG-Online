"use client";

import React, { useState, useEffect } from 'react';
import { Search, Package, Star, Coins, Clock, Loader, Lock } from 'lucide-react';
import AuthComponent from './auth';

const PokemonPackOpener = () => {
  const [user, setUser] = useState(null);  // Change from {} to null
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [packCards, setPackCards] = useState([]);
  const [wonderCards, setWonderCards] = useState([]);
  const [selectedCard, setWonderCard] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [timeUntilClaim, setTimeUntilClaim] = useState('');
  const [timeUntilWonder, setTimeUntilWonder] = useState('');
  const [hasSelected, setHasSelected] = useState(false);
  const [rar, setRar] = useState('');
  const [inventory, setInventory] = useState([]);

  const rarityColors = {
    'Common': 'bg-gray-300',
    'Uncommon': 'bg-blue-300',
    'Rare': 'bg-purple-300',
    'Rare Holo': 'bg-yellow-300',
    'Ultra Rare': 'bg-red-300',
    'Double Rare': 'bg-blue-100',
    'ACE SPEC Rare': 'bg-pink-300',
    'Special Illustration Rare': 'bg-pink-500',
    'Hyper Rare': 'bg-yellow-100',
    'Illustration Rare': 'bg-pink-200',
    'Shiny Rare': 'bg-gray-100',
    'Rare Rainbow': 'wrapper',
    "Rare Holo EX": 800,
    Promo: 200,
    Gold: 'bg-yellow-200'
  };

  // I'm not good at deciding Pokemon values

  const rarityValues = {
    'Common': 2,
    'Uncommon': 5,
    'Rare': 30,
    'Rare Holo': 100,
    'Ultra Rare': 500,
    'Double Rare': 1500,
    'ACE SPEC Rare': 750,
    'Special Illustration Rare': 5000,
    'Hyper Rare': 3500,
    'Illustration Rare': 2500,
    'Shiny Rare': 1000,
    'Rare Rainbow': 3000,
    'No Rarity': 1,
    "Rare Holo EX": 800,
    Promo: 200,
    Gold: 20000
  };

  useEffect(() => {
    const initializeData = async () => {
      setUserLoading(true);
      try {
        await fetchUser();
        await fetchSets();
      } catch (error) {
        console.error('Failed to initialize data:', error);
      } finally {
        setUserLoading(false);
      }
    };

    initializeData();
  }, []);

  // Separate useEffect for timer
  useEffect(() => {
    let timer;
    if (user) {
      updateTimers(); // Initial update
      timer = setInterval(updateTimers, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [user]);

  const fetchUser = async () => {
    try {
      const userResponse = await fetch('/api/user');
      const userData = await userResponse.json();

      if (!userResponse.ok) {
        setUser(null);
        setInventory([]);
        return;
      }

      const invResponse = await fetch('/api/inventory');
      const invData = await invResponse.json();

      setInventory(invData);
      setUser(userData);
      setUser(userData);
      setTimeUntilClaim(userData.lastCoinClaim);
      setTimeUntilWonder(userData.lastWonderPick);
      updateTimers();
    } catch (error) {
      console.error('Error fetching user:', error);
      // Keep the default user state if fetch fails
    }
  };

  const fetchSets = async () => {
    try {
      const response = await fetch('/v1/sets');
      const data = await response.json();
      setSets([...data.slice(0, 1),...data.reverse().slice(0, 5)]);
    } catch (error) {
      console.error('Failed to fetch sets:', error);
    }
  };

  const updateTimers = (currentUser = user) => {
    if (!currentUser) return;

    const now = new Date().getTime();
    const hourFormula = 60 * 60 * 1000;
    const nextClaim = new Date(currentUser.lastCoinClaim).getTime() + (24 * hourFormula);
    const nextWonder = new Date(currentUser.lastWonderPick).getTime() + (8 * hourFormula);
    const claimDiff = nextClaim - now;
    const wonderDiff = nextWonder - now;

    if (claimDiff <= 0) {
      setTimeUntilClaim('Available!');
    } else {
      setTimeUntilClaim(formatTime(claimDiff));
    }

    if (wonderDiff <= 0) {
      setTimeUntilWonder('Available!');
    } else {
      setTimeUntilWonder(formatTime(wonderDiff));
    }
  };

  const formatTime = (ms) => {
    if (ms <= 0) return 'Available!';
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const openPack = async () => {
    if (!selectedSet || !user || user.pokeCoins < 500) return;

    setLoading(true);
    try {
      const response = await fetch('/api/open-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: selectedSet.id })
      });
      
      if (!response.ok) throw new Error('Failed to open pack');
      
      const data = await response.json();
      setPackCards(data);
      await fetchUser();
    } catch (error) {
      console.error('Failed to open pack:', error);
    } finally {
      setLoading(false);
    }
  };

  const wonderPick = async () => {
    if (!selectedSet) return;
    
    const now = new Date();
    const lastPick = new Date(user.lastWonderPick);
    const canPick = now - lastPick >= 8 * 60 * 60 * 1000 || user.pokeCoins >= 3000;
    
    if (!canPick) return;

    try {
      const response = await fetch('/api/wonder-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: selectedSet.id })
      });
      
      if (!response.ok) throw new Error('Failed to initiate wonder pick');
      
      const data = await response.json();
      setWonderCards(data.wonderPick);
      setWonderCard(data.selectedCard);
      await fetchUser();
    } catch (error) {
      console.error('Failed to do wonder pick:', error);
    }
  };

  const selectWonderCard = async (cardId) => {
    try {
      setWonderCards([]); // Clear wonder pick options
      setPackCards(selectedCard); // Show the selected card
      setTimeout(setWonderCard(''), 500);
      await fetchUser();
    } catch (error) {
      console.error('Failed to claim wonder pick card:', error);
    }
  };

  const sellCard = async (card) => {
    try {
      const response = await fetch('/api/sell-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id })
      });
      
      if (!response.ok) throw new Error('Failed to sell card');
      
      await fetchUser();
    } catch (error) {
      console.error('Failed to sell card:', error);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader className="w-8 h-8 animate-spin" />
          <p>Loading your Pokemon collection...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Lock className="w-12 h-12 mb-4" />
        <p className="mb-4">Please authenticate to access TCG Online</p>
        <AuthComponent onAuthenticate={(userData) => setUser(userData)} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center">
          <Package className="mr-2" /> TCG Online Beta
        </h1>
        <div className="flex items-center">
          <Coins className="mr-2" />
          <span className="font-bold">{user.pokeCoins} PokeCoins</span>
        </div>
      </div>
      <h3>Base & Gold Legends Event!</h3>
      <h4>Good Luck! Can you unbox all 4 Gold Cards?</h4>
      <br></br>

      {/* Rest of the component remains the same, but use user.pokeCoins 
          instead of user?.pokeCoins since we now have default values */}
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold flex items-center mb-2">
            <Clock className="mr-2" /> Daily Coins
          </h2>
          <p>{timeUntilClaim}</p>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-semibold flex items-center mb-2">
            <Star className="mr-2" /> Random Card
          </h2>
          <p>{timeUntilWonder}</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold flex items-center">
          <Search className="mr-2" /> Select Set
        </label>
        <select 
  className="w-full p-2 border rounded"
  onChange={(e) => {
    const selected = sets[e.target.selectedIndex - 1];
    setSelectedSet(selected || null);
  }}
>
  <option>Choose a Set</option>
  {sets.map((set) => (
    <option key={set.id}>{set.name}</option>
  ))}
</select>
      </div>

      <div className="flex gap-2 mb-4">
        <button 
          onClick={openPack} 
          disabled={!selectedSet || loading || user.pokeCoins < 500}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Opening Pack...' : selectedSet && selectedSet.id == "base1" ? 'Open Pack (10000 PokeCoins)' : 'Open Pack (500 PokeCoins)'}
        </button>

        <button 
          onClick={wonderPick}
          disabled={!selectedSet || (timeUntilWonder !== 'Available!' && user.pokeCoins < 3000)}
          className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Random Card ({timeUntilWonder == 'Available!' ? "Free" : "3000 PokeCoins"})
        </button>
      </div>

      {/* Pack Cards Display */}
      {packCards.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Pack Contents</h2>
          <div className="grid grid-cols-5 gap-2">
            {packCards.map((card, index) => (
              <div 
                key={index} 
                className={`p-2 rounded ${rarityColors[card.rarity] || 'bg-gray-200'}`}
              >
                <img 
                  src={card.id.split("-")[0] == "gold" ? card.images.small : `https://wsrv.nl?url=${card.images.small}`}
                  alt={card.name} 
                  className="w-full h-auto object-contain"
                />
                <div className="text-center mt-1">
                  <p className="text-xs font-semibold">{card.name}</p>
                  <p className="text-xs text-gray-600">{card.rarity || 'No Rarity'}</p>
                  <div className="text-xs text-gray-600">Value: {card.id.split("-")[0] == "base1" ? rarityValues[card.rarity] * 1000 || 200 : rarityValues[card.rarity]} coins</div>
                  <button
                    onClick={() => sellCard(card)}
                    className="mt-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                  >
                    Sell Card
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wonder Pick Cards Display */}
      {wonderCards.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Choose Your Wonder Pick Card</h2>
          <div className="grid grid-cols-5 gap-2">
            {wonderCards.map((card, index) => (
              <div 
                key={index} 
                className="p-2 rounded bg-gray-200 cursor-pointer hover:bg-gray-300"
                onClick={() => selectWonderCard(card.id)}
              >
                <img 
                  src="/card-backs.png"
                  alt="Card Back" 
                  className="w-full h-auto object-contain"
                />
                <div className="text-center mt-1">
                  <p className="text-xs">Click to reveal!</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Display */}
      {inventory.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Your Inventory</h2>
          <div className="grid grid-cols-5 gap-2">
            {inventory.map((card, index) => (
              <div 
                key={index} 
                className={`p-2 rounded ${rarityColors[card.rarity] || 'bg-gray-200'}`}
              >
                <img 
                  src={card.id.split("-")[0] == "gold" ? card.images.small : `https://wsrv.nl?url=${card.images.small}`}
                  alt={card.name} 
                  className="w-full h-auto object-contain"
                />
                <div className="text-center mt-1">
                  <p className="text-xs font-semibold">{card.name}</p>
                  <p className="text-xs text-gray-600">{card.rarity || 'No Rarity'}</p>
                  <div className="text-xs text-gray-600">Value: {card.id.split("-")[0] == "base1" ? rarityValues[card.rarity] * 1000 || 200: rarityValues[card.rarity]} coins</div>
                  <button
                    onClick={() => sellCard(card)}
                    className="mt-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                  >
                    Sell Card
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-center mt-6 text-gray-400 text-xs">
        Account ID: {user.id}
      </div>
    </div>
  );
};

export default PokemonPackOpener;