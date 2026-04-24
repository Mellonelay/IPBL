import React from 'react';

export const BettingMemoryDrawerSection: React.FC<{ team1: string, team2: string, memory: any }> = ({ team1, team2, memory }) => {
    // Basic key matching (normalization)
    const key = `${team1}-${team2}`;
    const stats = memory[key];

    return (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid #2a3358', margin: '1rem 0' }}>
            <h4 style={{ color: '#00c076', margin: '0 0 0.5rem 0' }}>Betting Oracle</h4>
            {stats ? (
                <div>
                    <p style={{ margin: '0.2rem 0' }}>Total Matchups: {stats.total}</p>
                    <p style={{ margin: '0.2rem 0', color: '#00c076' }}>Wins: {stats.wins}</p>
                    <p style={{ margin: '0.2rem 0', color: '#ff4d4f' }}>Losses: {stats.losses}</p>
                </div>
            ) : (
                <p style={{ color: '#97a2c7' }}>No historical edge data available for {team1} vs {team2}.</p>
            )}
        </div>
    );
};