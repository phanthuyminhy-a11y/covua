import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Play, Trophy, RotateCcw, Trash2, CheckCircle2, UserPlus, FileText, Upload, Settings2, X, Download, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Pairing, Round, TournamentState } from './types';
import { generatePairings, calculateBuchholz } from './utils';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundNumber, setCurrentRoundNumber] = useState(0);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState('');
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [isManualSetup, setIsManualSetup] = useState(false);
  const [manualPairings, setManualPairings] = useState<Pairing[]>([]);
  const [selectedP1, setSelectedP1] = useState<string>('');
  const [selectedP2, setSelectedP2] = useState<string>('');
  const [totalRounds, setTotalRounds] = useState(5);
  const [isTournamentFinished, setIsTournamentFinished] = useState(false);

  // Standings calculation
  const standings = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.buchholz - a.buchholz;
    });
  }, [players]);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlayerName.trim(),
      rating: parseInt(newPlayerRating) || 0,
      score: 0,
      buchholz: 0,
      opponents: [],
      colorHistory: [],
      hadBye: false,
    };
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setNewPlayerRating('');
  };

  const removePlayer = (id: string) => {
    if (tournamentStarted) return;
    setPlayers(players.filter(p => p.id !== id));
  };

  const startTournament = () => {
    if (players.length < 2) return;
    setTournamentStarted(true);
    nextRound();
  };

  const nextRound = () => {
    const nextNum = currentRoundNumber + 1;
    const updatedPlayers = calculateBuchholz(players, players);
    const newPairings = generatePairings(updatedPlayers, nextNum);
    
    const newRound: Round = {
      number: nextNum,
      pairings: newPairings,
      isCompleted: false,
    };
    
    setRounds([...rounds, newRound]);
    setCurrentRoundNumber(nextNum);
    setPlayers(updatedPlayers);
  };

  const updateResult = (pairingIndex: number, result: Pairing['result']) => {
    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[currentRoundNumber - 1];
    currentRound.pairings[pairingIndex].result = result;
    setRounds(updatedRounds);
  };

  const completeRound = () => {
    const currentRound = rounds[currentRoundNumber - 1];
    const allResultsEntered = currentRound.pairings.every(p => p.result);
    
    if (!allResultsEntered) {
      alert('Vui lòng nhập đầy đủ kết quả các trận đấu!');
      return;
    }

    const updatedPlayers = [...players];
    currentRound.pairings.forEach(p => {
      if (p.white && p.black) {
        const wIdx = updatedPlayers.findIndex(pl => pl.id === p.white!.id);
        const bIdx = updatedPlayers.findIndex(pl => pl.id === p.black!.id);
        
        updatedPlayers[wIdx].opponents.push(p.black.id);
        updatedPlayers[bIdx].opponents.push(p.white.id);
        updatedPlayers[wIdx].colorHistory.push('W');
        updatedPlayers[bIdx].colorHistory.push('B');

        if (p.result === '1-0') updatedPlayers[wIdx].score += 1;
        else if (p.result === '0-1') updatedPlayers[bIdx].score += 1;
        else if (p.result === '0.5-0.5') {
          updatedPlayers[wIdx].score += 0.5;
          updatedPlayers[bIdx].score += 0.5;
        }
      } else if (p.white && !p.black) {
        // Bye
        const wIdx = updatedPlayers.findIndex(pl => pl.id === p.white!.id);
        updatedPlayers[wIdx].score += 1;
        updatedPlayers[wIdx].hadBye = true;
      }
    });

    const finalPlayers = calculateBuchholz(updatedPlayers, updatedPlayers);
    setPlayers(finalPlayers);
    
    const newRounds = [...rounds];
    newRounds[currentRoundNumber - 1].isCompleted = true;
    setRounds(newRounds);

    if (currentRoundNumber >= totalRounds) {
      setIsTournamentFinished(true);
    }
  };

  const resetTournament = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại giải đấu? Toàn bộ dữ liệu sẽ bị xóa.')) {
      setPlayers([]);
      setRounds([]);
      setCurrentRoundNumber(0);
      setTournamentStarted(false);
      setIsManualSetup(false);
      setManualPairings([]);
      setIsTournamentFinished(false);
      setTotalRounds(5);
    }
  };

  const addManualPairing = () => {
    if (!selectedP1) return;
    
    const p1 = players.find(p => p.id === selectedP1)!;
    const p2 = players.find(p => p.id === selectedP2) || null;

    const newPairing: Pairing = {
      white: p1,
      black: p2,
    };

    setManualPairings([...manualPairings, newPairing]);
    setSelectedP1('');
    setSelectedP2('');
  };

  const removeManualPairing = (index: number) => {
    setManualPairings(manualPairings.filter((_, i) => i !== index));
  };

  const startWithManualPairings = () => {
    const pairedPlayerIds = new Set<string>();
    manualPairings.forEach(p => {
      if (p.white) pairedPlayerIds.add(p.white.id);
      if (p.black) pairedPlayerIds.add(p.black.id);
    });

    if (pairedPlayerIds.size !== players.length) {
      alert('Vui lòng sắp xếp cặp đấu cho tất cả kỳ thủ!');
      return;
    }

    setTournamentStarted(true);
    setIsManualSetup(false);
    
    const newRound: Round = {
      number: 1,
      pairings: manualPairings,
      isCompleted: false,
    };
    
    setRounds([newRound]);
    setCurrentRoundNumber(1);
    setPlayers(calculateBuchholz(players, players));
  };

  const unpairedPlayers = players.filter(p => {
    return !manualPairings.some(mp => mp.white?.id === p.id || mp.black?.id === p.id);
  });

  const exportMatchToWord = (pairing: Pairing, roundNum: number, tableIdx: number) => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Match Record</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        .header { text-align: center; font-weight: bold; font-size: 22pt; margin-bottom: 10px; text-transform: uppercase; }
        .sub-header { text-align: center; font-size: 14pt; margin-bottom: 30px; font-style: italic; }
        .info-section { margin-bottom: 20px; border-bottom: 1px solid #000; pb: 10px; }
        .match-details { border: 2px solid #000; padding: 20px; margin-bottom: 40px; }
        .player-row { font-size: 16pt; margin: 10px 0; }
        .result-box { margin-top: 20px; font-size: 18pt; font-weight: bold; text-align: center; border: 1px dashed #000; padding: 10px; }
        .signature-grid { margin-top: 80px; width: 100%; }
        .sig-col { text-align: center; width: 33%; vertical-align: top; }
      </style>
      </head>
      <body>
        <div class="header">BIÊN BẢN TRẬN ĐẤU</div>
        <div class="sub-header">Giải vô địch Cờ vua - XÃ NGUYỄN VIỆT KHÁI </div>
        
        <div class="info-section">
          <p><b>Vòng đấu:</b> ${roundNum} &nbsp;&nbsp;&nbsp;&nbsp; <b>Bàn số:</b> ${tableIdx + 1}</p>
          <p><b>Ngày thi đấu:</b> ${new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <div class="match-details">
          <div class="player-row"><b>Quân Trắng:</b> ${pairing.white?.name} (${pairing.white?.rating || '---'})</div>
          <div class="player-row"><b>Quân Đen:</b> ${pairing.black?.name || 'BYE'} (${pairing.black?.rating || '---'})</div>
          <div class="result-box">KẾT QUẢ: ${pairing.result || '....................'}</div>
        </div>

        <table class="signature-grid">
          <tr>
            <td class="sig-col"><b>Kỳ thủ Trắng</b><br><br><br><br>(Ký và ghi rõ họ tên)</td>
            <td class="sig-col"><b>Kỳ thủ Đen</b><br><br><br><br>(Ký và ghi rõ họ tên)</td>
            <td class="sig-col"><b>Trọng tài</b><br><br><br><br>(Ký tên)</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bien_ban_Vong_${roundNum}_Ban_${tableIdx + 1}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRoundToWord = (round: Round) => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Pairing List</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        .header { text-align: center; font-weight: bold; font-size: 20pt; margin-bottom: 5px; }
        .sub-header { text-align: center; font-size: 16pt; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid black; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; }
      </style>
      </head>
      <body>
        <div class="header">DANH SÁCH CẶP ĐẤU</div>
        <div class="sub-header">Vòng ${round.number}</div>
        
        <table>
          <thead>
            <tr>
              <th>Bàn</th>
              <th>Quân Trắng</th>
              <th>Điểm</th>
              <th>Kết quả</th>
              <th>Điểm</th>
              <th>Quân Đen</th>
            </tr>
          </thead>
          <tbody>
            ${round.pairings.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.white?.name}</td>
                <td>${p.white?.score}</td>
                <td>${p.result || 'vs'}</td>
                <td>${p.black?.score || ''}</td>
                <td>${p.black?.name || 'BYE'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_cap_dau_Vong_${round.number}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportResultsToWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Tournament Results</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        .header { text-align: center; font-weight: bold; font-size: 22pt; margin-bottom: 5px; }
        .sub-header { text-align: center; font-size: 16pt; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid black; padding: 10px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .rank-1 { background-color: #fff7e6; font-weight: bold; }
      </style>
      </head>
      <body>
        <div class="header">KẾT QUẢ CHUNG CUỘC</div>
        <div class="sub-header">Giải vô địch Cờ vua - XÃ NGUYỄN VIỆT KHÁI<br>Tổng số vòng: ${totalRounds}</div>
        
        <table>
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Họ và tên</th>
              <th>Elo</th>
              <th>Tổng điểm</th>
              <th>Hệ số Buchholz</th>
            </tr>
          </thead>
          <tbody>
            ${standings.map((p, i) => `
              <tr class="${i === 0 ? 'rank-1' : ''}">
                <td>${i + 1}</td>
                <td style="text-align: left;">${p.name}</td>
                <td>${p.rating || '---'}</td>
                <td><b>${p.score}</b></td>
                <td>${p.buchholz}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p><i>Ngày ........ tháng ........ năm 20....</i></p>
          <p style="margin-right: 50px;"><b>TRƯỞNG BAN TỔ CHỨC</b></p>
          <br><br><br>
          <p style="margin-right: 50px;">(Ký tên và đóng dấu)</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ket_qua_chung_cuoc_Giai_dau.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r?\n/);
      const newPlayers: Player[] = [];

      lines.forEach(line => {
        if (!line.trim()) return;
        
        // Support CSV: Name,Rating
        const parts = line.split(',');
        const name = parts[0].trim();
        const rating = parts[1] ? parseInt(parts[1].trim()) : 0;

        if (name) {
          newPlayers.push({
            id: Math.random().toString(36).substr(2, 9) + Date.now(),
            name,
            rating: isNaN(rating) ? 0 : rating,
            score: 0,
            buchholz: 0,
            opponents: [],
            colorHistory: [],
            hadBye: false,
          });
        }
      });

      if (newPlayers.length > 0) {
        setPlayers(prev => [...prev, ...newPlayers]);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-chess-bg text-chess-ink font-sans p-4 md:p-8 selection:bg-chess-gold selection:text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6"
          >
            <div className="w-16 h-16 bg-chess-blue rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-chess-blue/30 rotate-3">
              <Trophy className="text-chess-gold" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight uppercase italic font-serif text-chess-blue">
                TRƯỜNG TH RẠCH CHÈO
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="h-[2px] w-12 bg-chess-gold rounded-full"></span>
                <p className="text-xs font-extrabold tracking-[0.3em] text-chess-gold uppercase font-mono">CHESS ASSISTANT V1.0</p>
              </div>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3"
          >
            {tournamentStarted && (
              <button 
                onClick={resetTournament}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-bold text-xs uppercase shadow-sm group"
              >
                <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" /> RESET
              </button>
            )}
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Player Management / Standings */}
          <div className="lg:col-span-4 space-y-8">
            <section className="chess-card p-8">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-chess-blue italic font-serif">
                <Users size={24} className="text-chess-gold" /> Kỳ thủ tham gia
              </h2>
              
              {!tournamentStarted && (
                <div className="space-y-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-1">Tên kỳ thủ</label>
                    <input 
                      type="text" 
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      className="chess-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-1">Hệ số Elo</label>
                      <input 
                        type="number" 
                        value={newPlayerRating}
                        onChange={(e) => setNewPlayerRating(e.target.value)}
                        placeholder="1200"
                        className="chess-input font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-1">Số vòng</label>
                      <input 
                        type="number" 
                        value={totalRounds}
                        onChange={(e) => setTotalRounds(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="5"
                        className="chess-input font-mono"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={addPlayer}
                    className="chess-button-primary w-full flex items-center justify-center gap-2"
                  >
                    <UserPlus size={18} /> THÊM VÀO DANH SÁCH
                  </button>

                  <div className="relative pt-2">
                    <input 
                      type="file" 
                      accept=".txt,.csv" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl uppercase text-[10px] font-black tracking-widest hover:border-chess-gold hover:text-chess-gold transition-all flex items-center justify-center gap-3 cursor-pointer group"
                    >
                      <Upload size={18} className="group-hover:-translate-y-1 transition-transform" /> NHẬP DỮ LIỆU TỪ FILE
                    </label>
                  </div>
                </div>
              )}

              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/50 overflow-hidden">
                {players.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 opacity-10">
                    <Users size={64} strokeWidth={1} />
                    <p className="text-xs font-bold uppercase tracking-widest mt-4">Chưa có dữ liệu</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/50">
                      <tr className="text-[9px] uppercase font-black text-slate-400 tracking-widest">
                        <th className="px-6 py-4">Kỳ thủ</th>
                        <th className="px-6 py-4 text-right">ELO</th>
                        {!tournamentStarted && <th className="px-6 py-4"></th>}
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {players.map((p, i) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={p.id} 
                          className="border-b border-slate-100 hover:bg-white transition-colors group"
                        >
                          <td className="px-6 py-4 font-bold text-chess-blue">{p.name}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-400 font-medium">{p.rating || '---'}</td>
                          {!tournamentStarted && (
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => removePlayer(p.id)} 
                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {!tournamentStarted && players.length >= 2 && !isManualSetup && (
                <div className="space-y-4 mt-8">
                  <button 
                    onClick={startTournament}
                    className="chess-button-gold w-full py-5 text-lg tracking-[0.3em] flex items-center justify-center gap-4"
                  >
                    <Play size={24} fill="currentColor" /> KHỞI CHẠY
                  </button>
                  <button 
                    onClick={() => setIsManualSetup(true)}
                    className="w-full py-4 border-2 border-chess-blue text-chess-blue rounded-2xl hover:bg-chess-blue hover:text-white transition-all uppercase font-black tracking-widest text-[10px] flex items-center justify-center gap-3"
                  >
                    <Settings2 size={18} /> SẮP XẾP THỦ CÔNG
                  </button>
                </div>
              )}
            </section>

            {isManualSetup && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="chess-card p-8 ring-4 ring-chess-gold/20"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black italic font-serif text-chess-blue">Ghép cặp vòng 1</h2>
                  <button onClick={() => setIsManualSetup(false)} className="text-slate-300 hover:text-chess-ink transition-colors p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Quân Trắng</label>
                      <select 
                        value={selectedP1}
                        onChange={(e) => setSelectedP1(e.target.value)}
                        className="chess-input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                      >
                        <option value="">Chọn...</option>
                        {unpairedPlayers.map(p => (
                          <option key={p.id} value={p.id} disabled={p.id === selectedP2}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Quân Đen</label>
                      <select 
                        value={selectedP2}
                        onChange={(e) => setSelectedP2(e.target.value)}
                        className="chess-input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                      >
                        <option value="">Bye (Cộng 1đ)</option>
                        {unpairedPlayers.map(p => (
                          <option key={p.id} value={p.id} disabled={p.id === selectedP1}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button 
                    onClick={addManualPairing}
                    disabled={!selectedP1}
                    className="chess-button-primary w-full py-4 text-xs tracking-widest"
                  >
                    XÁC NHẬN CẶP ĐẤU
                  </button>
                </div>

                <div className="space-y-4 mb-10">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.3em] flex items-center gap-4">
                    TRẬN ĐẤU ĐÃ LẬP <span className="h-[2px] flex-1 bg-slate-100 rounded-full"></span>
                  </p>
                  {manualPairings.length === 0 && <p className="text-[10px] italic opacity-20 text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl uppercase tracking-widest font-black">Chưa có cặp đấu</p>}
                  <div className="space-y-3">
                    {manualPairings.map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 flex items-center justify-center bg-chess-blue text-white rounded-xl text-[10px] font-black">B{i+1}</span>
                          <span className="font-extrabold text-chess-blue text-sm">{p.white?.name}</span>
                          <span className="text-chess-gold italic font-bold">vs</span>
                          <span className="font-extrabold text-chess-blue text-sm">{p.black?.name || 'BYE'}</span>
                        </div>
                        <button onClick={() => removeManualPairing(i)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={startWithManualPairings}
                  disabled={unpairedPlayers.length > 0 && manualPairings.length === 0}
                  className="chess-button-primary w-full py-5 tracking-[0.4em] shadow-2xl shadow-chess-blue/40"
                >
                  BẮT ĐẦU GIẢI ĐẤU
                </button>
              </motion.section>
            )}

            {tournamentStarted && (
              <section className="chess-card bg-chess-blue text-white relative overflow-hidden p-8 border-none ring-1 ring-chess-gold/30">
                <div className="absolute -top-12 -right-8 opacity-5">
                   <Trophy size={200} strokeWidth={1} className="text-chess-gold" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-chess-gold italic font-serif">
                    <Trophy size={24} /> Bảng xếp hạng
                  </h2>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="grid grid-cols-6 text-[9px] uppercase font-black text-white/30 mb-4 ml-1 tracking-widest">
                      <div className="col-span-1">Hạng</div>
                      <div className="col-span-3">Kỳ thủ</div>
                      <div className="col-span-1 text-right">Điểm</div>
                      <div className="col-span-1 text-right">BH</div>
                    </div>
                    {standings.map((p, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={p.id} 
                        className={`grid grid-cols-6 items-center px-4 py-3 rounded-2xl border border-transparent transition-all ${idx === 0 ? 'bg-white/10 border-chess-gold/40 shadow-2xl shadow-black/20 translate-x-1' : 'hover:bg-white/5'}`}
                      >
                        <div className="col-span-1 text-[11px] font-black flex items-center gap-3">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </div>
                        <div className="col-span-3 truncate font-bold text-sm tracking-tight">{p.name}</div>
                        <div className="col-span-1 text-right font-black text-base text-chess-gold">{p.score}</div>
                        <div className="col-span-1 text-right text-white/40 font-medium">{p.buchholz}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Active Round / Pairings */}
          <div className="lg:col-span-8">
            {!tournamentStarted ? (
              <div className="h-full min-h-[700px] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-[3rem] p-16 text-center bg-white/40 relative overflow-hidden group">
                <div className="absolute inset-0 pattern-grid opacity-[0.02] text-chess-blue"></div>
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl shadow-slate-200 border border-slate-100 group-hover:scale-110 transition-transform relative z-10"
                >
                   <Users size={48} className="text-chess-gold" strokeWidth={1.5} />
                </motion.div>
                <div className="relative z-10">
                  <h3 className="text-4xl font-serif italic text-chess-blue font-bold mb-6">Chào mừng trọng tài!</h3>
                  <p className="max-w-md mx-auto text-base text-slate-400 leading-relaxed font-medium">Hệ thống quản lý hệ Thụy Sỹ đã sẵn sàng. Hãy thêm kỳ thủ và xác lập lộ trình thi đấu để bắt đầu giải đấu chuyên nghiệp của bạn.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Current Round Card */}
                <AnimatePresence mode="wait">
                  <motion.section 
                    key={currentRoundNumber}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="chess-card relative p-10 lg:p-12"
                  >
                    <div className="absolute inset-0 pattern-grid opacity-[0.03] text-chess-ink pointer-events-none"></div>

                    <div className="relative z-10">
                      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-8 border-b border-slate-100 pb-10">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                             <div className="w-3 h-3 rounded-full bg-chess-gold animate-ping"></div>
                             <span className="text-[10px] uppercase font-black text-chess-gold tracking-[0.4em]">Tournament In Progress</span>
                          </div>
                          <h2 className="text-6xl font-serif italic text-chess-blue font-black tracking-tight">Vòng thi đấu {currentRoundNumber}</h2>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={() => exportRoundToWord(rounds[currentRoundNumber - 1])}
                            className="bg-slate-50 text-chess-blue p-4 aspect-square border border-slate-200 rounded-2xl hover:bg-white hover:shadow-xl transition-all group"
                            title="Xuất bảng đấu"
                          >
                            <FileDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
                          </button>
                          
                          {isTournamentFinished ? (
                            <button 
                              onClick={exportResultsToWord}
                              className="px-10 py-5 bg-chess-gold text-white rounded-2xl font-black text-sm hover:brightness-110 active:scale-95 shadow-[0_20px_40px_-15px_rgba(212,175,55,0.4)] transition-all flex items-center gap-4"
                            >
                              <Trophy size={20} fill="currentColor" /> XUẤT KẾT QUẢ CHUNG CUỘC
                            </button>
                          ) : rounds[currentRoundNumber - 1]?.isCompleted ? (
                            <button 
                              onClick={nextRound}
                              className="px-10 py-5 bg-chess-blue text-white rounded-2xl font-black text-sm hover:bg-chess-ink hover:scale-105 active:scale-95 shadow-[0_20px_40px_-15px_rgba(30,41,59,0.4)] transition-all flex items-center gap-4"
                            >
                              TIẾP TỤC VÒNG {currentRoundNumber + 1} <Play size={20} fill="currentColor" />
                            </button>
                          ) : (
                            <button 
                              onClick={completeRound}
                              className="px-10 py-5 border-2 border-chess-blue text-chess-blue rounded-2xl font-black text-sm hover:bg-chess-blue hover:text-white transition-all flex items-center gap-4 group"
                            >
                              KẾT THÚC VÒNG ĐẤU <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isTournamentFinished && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-12 p-10 bg-chess-gold rounded-[2.5rem] text-white text-center shadow-2xl shadow-chess-gold/30 relative overflow-hidden"
                        >
                          <div className="absolute inset-0 pattern-grid opacity-10"></div>
                          <div className="relative z-10">
                            <Trophy size={64} className="mx-auto mb-6 text-white" strokeWidth={1.5} />
                            <h3 className="text-4xl font-serif italic font-black mb-3 uppercase tracking-tight">Vinh danh các nhà vô địch</h3>
                            <p className="text-xs opacity-70 font-mono font-bold tracking-[0.3em] uppercase">Mùa giải đã khép lại thành công rực rỡ</p>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-6">
                        {rounds[currentRoundNumber - 1]?.pairings.map((pairing, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={idx} 
                            className="group relative"
                          >
                            <div className="flex flex-col md:flex-row items-center gap-6 p-5 md:p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-xl hover:border-chess-gold/20 transition-all duration-500">
                              
                              {/* White Player */}
                              <div className="flex-1 w-full text-center md:text-left">
                                <div className="flex items-center gap-6 justify-center md:justify-start mb-2">
                                  <div className="px-3 py-1 bg-white border-2 border-slate-100 rounded-lg font-serif text-xs font-black shadow-sm group-hover:rotate-6 transition-transform text-chess-blue uppercase tracking-wider">TRẮNG</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xl font-black text-chess-blue leading-tight truncate tracking-tight">{pairing.white?.name}</p>
                                    <div className="flex items-center gap-2 mt-2 opacity-40 font-mono text-[10px] font-bold justify-center md:justify-start">
                                      <span className="bg-slate-200 px-2 py-0.5 rounded-full">ELO: {pairing.white?.rating || '---'}</span>
                                      <span className="bg-slate-200 px-2 py-0.5 rounded-full">D: {pairing.white?.score}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* VS / Result Center */}
                              <div className="flex flex-col items-center justify-center gap-4 py-3 px-6 border-y md:border-y-0 md:border-x border-slate-100 md:min-w-[200px]">
                                <div className="flex gap-2">
                                  {pairing.black ? (
                                    <>
                                      {[ {label: '1-0', val: '1-0'}, {label: '½-½', val: '0.5-0.5'}, {label: '0-1', val: '0-1'} ].map(res => (
                                        <button 
                                          key={res.val}
                                          onClick={() => updateResult(idx, res.val as any)}
                                          disabled={rounds[currentRoundNumber - 1].isCompleted}
                                          className={`w-12 h-10 flex items-center justify-center text-[12px] font-black rounded-xl border-2 transition-all ${pairing.result === res.val ? 'bg-chess-blue text-white shadow-xl shadow-chess-blue/30 border-chess-blue scale-110' : 'bg-white border-slate-200 text-slate-400 hover:border-chess-blue/40'}`}
                                        >
                                          {res.label}
                                        </button>
                                      ))}
                                    </>
                                  ) : (
                                    <div className="px-5 py-2.5 bg-green-50 text-green-700 rounded-xl border-2 border-green-100 text-[11px] font-black tracking-[0.2em] uppercase flex items-center gap-3 shadow-sm">
                                       <CheckCircle2 size={16} /> MIỄN ĐẤU (BYE)
                                    </div>
                                  )}
                                </div>
                                {pairing.black && (
                                  <button 
                                    onClick={() => exportMatchToWord(pairing, currentRoundNumber, idx)}
                                    className="flex items-center gap-2 text-[10px] uppercase font-black text-slate-300 hover:text-chess-gold transition-colors py-2 px-4 bg-white rounded-full border border-slate-100 shadow-sm"
                                  >
                                    <FileDown size={14} /> BIÊN BẢN BÀN {idx + 1}
                                  </button>
                                )}
                              </div>

                              {/* Black Player */}
                              <div className="flex-1 w-full text-center md:text-right">
                                <div className="flex items-center gap-6 justify-center md:justify-end mb-2 flex-row-reverse">
                                  <div className="px-3 py-1 bg-chess-ink text-white border-2 border-slate-100 rounded-lg font-serif text-xs font-black shadow-sm group-hover:-rotate-6 transition-transform uppercase tracking-wider">ĐEN</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xl font-black text-chess-blue leading-tight truncate tracking-tight">{pairing.black?.name || '---'}</p>
                                    <div className="flex items-center gap-3 mt-3 opacity-40 font-mono text-[10px] font-bold justify-center md:justify-end flex-row-reverse">
                                      <span className="bg-slate-200 px-2 py-0.5 rounded-full">ELO: {pairing.black?.rating || '---'}</span>
                                      <span className="bg-slate-200 px-2 py-0.5 rounded-full">D: {pairing.black?.score || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.section>
                </AnimatePresence>

                {/* History */}
                <section className="chess-card p-10 border-none">
                  <h3 className="text-2xl font-black mb-10 flex items-center gap-3 text-chess-blue italic font-serif">
                    <FileText size={26} className="text-chess-gold" /> Nhật ký lộ trình thi đấu
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                    {rounds.map((r, i) => (
                      <button 
                        key={i} 
                        onClick={() => r.isCompleted && setCurrentRoundNumber(r.number)}
                        className={`p-6 rounded-[2rem] border-2 text-center transition-all duration-300 relative group ${currentRoundNumber === r.number ? 'bg-chess-blue border-chess-blue text-white shadow-2xl shadow-chess-blue/40 -translate-y-2' : r.isCompleted ? 'bg-white border-slate-100 hover:border-chess-gold text-chess-blue shadow-sm' : 'bg-slate-50 border-transparent opacity-40 cursor-not-allowed'}`}
                      >
                        <p className={`text-[10px] uppercase font-black tracking-widest mb-3 ${currentRoundNumber === r.number ? 'text-white/40' : 'text-slate-300'}`}>ROUND</p>
                        <p className="text-4xl font-serif italic font-black line-height-none">{r.number}</p>
                        <div className={`mt-4 inline-flex items-center gap-2 text-[8px] font-black uppercase px-3 py-1 rounded-full ${r.isCompleted ? 'bg-green-100 text-green-700' : 'bg-chess-gold/10 text-chess-gold'}`}>
                          {r.isCompleted ? 'XONG' : 'ĐANG ĐẤU'}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] opacity-[0.03]">
        <div className="absolute top-[10%] left-[5%] text-[10rem] font-serif rotate-12 opacity-10">♖</div>
        <div className="absolute bottom-[10%] right-[10%] text-[15rem] font-serif -rotate-12 opacity-10">♔</div>
      </div>
    </div>
  );
};

export default App;
