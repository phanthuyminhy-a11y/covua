import { Player, Pairing, Round } from './types';

/**
 * Simple Swiss System Pairing Algorithm
 * 1. Sort players by score, then Buchholz (or rating if available)
 * 2. Handle bye for odd number of players
 * 3. Pair players with similar scores who haven't played each other
 */
export function generatePairings(players: Player[], roundNumber: number): Pairing[] {
  const pairings: Pairing[] = [];
  let availablePlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.rating || 0) - (a.rating || 0);
  });

  // Handle Bye
  if (availablePlayers.length % 2 !== 0) {
    // Find the lowest ranked player who hasn't had a bye
    for (let i = availablePlayers.length - 1; i >= 0; i--) {
      if (!availablePlayers[i].hadBye) {
        const byePlayer = availablePlayers.splice(i, 1)[0];
        pairings.push({ white: byePlayer, black: null, result: '1-0b' });
        break;
      }
    }
  }

  // Pairing logic
  while (availablePlayers.length > 0) {
    const p1 = availablePlayers.shift()!;
    let found = false;

    for (let i = 0; i < availablePlayers.length; i++) {
      const p2 = availablePlayers[i];
      if (!p1.opponents.includes(p2.id)) {
        // Found a valid opponent
        availablePlayers.splice(i, 1);
        
        // Determine colors (simplistic: alternate based on history)
        const p1WhiteCount = p1.colorHistory.filter(c => c === 'W').length;
        const p1BlackCount = p1.colorHistory.filter(c => c === 'B').length;
        const p2WhiteCount = p2.colorHistory.filter(c => c === 'W').length;
        const p2BlackCount = p2.colorHistory.filter(c => c === 'B').length;

        if (p1WhiteCount <= p1BlackCount && p2WhiteCount >= p2BlackCount) {
          pairings.push({ white: p1, black: p2 });
        } else {
          pairings.push({ white: p2, black: p1 });
        }
        
        found = true;
        break;
      }
    }

    if (!found && availablePlayers.length > 0) {
      // Fallback: pair with the next available even if they played (should be rare in early rounds)
      const p2 = availablePlayers.shift()!;
      pairings.push({ white: p1, black: p2 });
    }
  }

  return pairings;
}

export function calculateBuchholz(players: Player[], allPlayers: Player[]): Player[] {
  return players.map(player => {
    const buchholz = player.opponents.reduce((sum, oppId) => {
      const opponent = allPlayers.find(p => p.id === oppId);
      return sum + (opponent ? opponent.score : 0);
    }, 0);
    return { ...player, buchholz };
  });
}
