import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card } from '../../design-system';
import { useStore } from '../../store/useStore';
import { Bot, User, Send, Mic, MicOff, Sparkles } from 'lucide-react';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  tableData?: Array<Record<string, any>>;
}

export const AICoachView: React.FC = () => {
  const addXp = useStore(state => state.addXp);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Good evening Ashutosh! I am your Xpenser Pro Financial Coach. Ask me about your expenses, budgets, SIPs, or run feasibility checks (e.g., "Can I afford a PS5 next month?").',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Live queries to fetch dynamic DB data for calculations
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const investments = useLiveQuery(() => db.investments.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    
    // Simulate thinking lag
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let aiResponseText = '';
    let tableData: Array<Record<string, any>> | undefined;

    const lowerQuery = queryText.toLowerCase();

    // DYNAMIC PARSER LOGIC
    if (lowerQuery.includes('afford') && lowerQuery.includes('ps5')) {
      const currentCash = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0) -
        transactions
        .filter(t => t.type === 'expense' || (t.type === 'transfer' && t.category === 'Investment'))
        .reduce((acc, t) => acc + t.amount, 0);

      const macBookGoal = goals.find(g => g.name.includes('MacBook'));
      const remainingForMacBook = macBookGoal ? macBookGoal.targetAmount - macBookGoal.currentAmount : 0;

      aiResponseText = `Let me audit your cash buffers...\n\n` +
        `• Liquid Savings Balance: ₹${currentCash.toLocaleString()}\n` +
        `• MacBook Goal Remaining: ₹${remainingForMacBook.toLocaleString()}\n` +
        `• PS5 Estimated Cost: ₹55,000\n\n` +
        `Verdict: **Yes, you can afford a PS5 next month!** You have sufficient liquid cash (₹${currentCash.toLocaleString()}) to absorb the purchase. However, it will delay your MacBook goal target date by roughly 12 days. I suggest locking in a 7-day dining-out spending freeze (limit: ₹1,500) to balance the gap.`;
    } 
    else if (lowerQuery.includes('why') && lowerQuery.includes('spend')) {
      const recentExpenses = transactions
        .filter(t => t.type === 'expense')
        .slice(0, 3);

      aiResponseText = `Your recent outflows show that you spent most heavily on Utilities and custom Shopping this week:\n\n` +
        recentExpenses.map((t, i) => `${i+1}. **${t.description}** (₹${t.amount.toLocaleString()}) on category *${t.category}*`).join('\n') +
        `\n\nRestricting custom hardware upgrades or cafe restaurant trips this week will save you ₹2,500 instantly.`;
    } 
    else if (lowerQuery.includes('restaurant') || lowerQuery.includes('food')) {
      const restTxs = transactions.filter(t => t.category === 'Restaurants');
      tableData = restTxs.map(t => ({
        Description: t.description,
        Amount: `₹${t.amount.toLocaleString()}`,
        Date: t.date
      }));

      aiResponseText = `Here are your recent Restaurant spending records. You have recorded ${restTxs.length} dining expenses so far this period:`;
    } 
    else if (lowerQuery.includes('invest') || lowerQuery.includes('sip')) {
      const totalSip = investments.reduce((acc, inv) => acc + inv.sipAmount, 0);
      aiResponseText = `You are currently investing **₹${totalSip.toLocaleString()}/month** in automatic SIPs across Index Funds, Gold, and Crypto.\n\n` +
        `Considering your average salary credit of ₹1,15,000 and total monthly bills of ~₹38,000, you have an unallocated surplus of **₹42,000/month**.\n\n` +
        `I recommend increasing your *Nifty 50 Index Fund SIP* by **₹5,000/month** to capture compound returns.`;
    } 
    else {
      aiResponseText = `I ran a scan on your Xpenser Pro database, but couldn't find a specific parser match for that query. Try asking something like:\n` +
        `- "Can I afford a PS5 next month?"\n` +
        `- "Why did I spend so much this week?"\n` +
        `- "Show restaurant expenses"\n` +
        `- "How much can I invest monthly?"`;
    }

    const aiMsg: ChatMessage = {
      sender: 'ai',
      text: aiResponseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tableData
    };

    setMessages(prev => [...prev, aiMsg]);
    await addXp(15); // Award XP for chatting/investigating finances
  };

  const handleVoiceSimulate = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      // Simulate listening and typing a voice query in 3 seconds
      setTimeout(() => {
        setIsListening(false);
        handleQuery("Can I afford a PS5 next month?");
      }, 3000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', height: 'calc(100vh - 120px)' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="page-title-group">
          <h2 style={{ fontSize: '1.75rem', margin: 0 }}>AI Financial Coach</h2>
          <span className="page-subtitle">Interact with natural language queries to explore budgets &amp; simulations</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 'var(--space-lg)', flex: 1, minHeight: 0 }}>
        
        {/* CHAT INTERFACE PANE */}
        <Card variant="glass" style={{ display: 'flex', flexDirection: 'column', padding: '16px', height: '100%', minHeight: 0 }}>
          
          {/* Scrollable messages container */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar Icon */}
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: msg.sender === 'ai' ? 'var(--primary)' : 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: msg.sender === 'ai' ? '#fff' : 'var(--text-heading)',
                    flexShrink: 0
                  }}
                >
                  {msg.sender === 'ai' ? <Bot size={16} /> : <User size={16} />}
                </div>

                {/* Msg text bubble */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div 
                    style={{
                      background: msg.sender === 'user' ? 'rgba(var(--primary-rgb), 0.08)' : 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      color: 'var(--text-heading)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5'
                    }}
                  >
                    {msg.text}

                    {/* Conditional Table render */}
                    {msg.tableData && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '0.75rem', border: '1px solid var(--border)' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '6px', textAlign: 'left' }}>Description</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '6px', textAlign: 'center' }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {msg.tableData.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px' }}>{row.Description}</td>
                              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>{row.Amount}</td>
                              <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.Date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input submission box */}
          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <input
              type="text"
              placeholder="Ask AI Coach (e.g. Can I afford a PS5 next month?)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuery(inputText); }}
              style={{
                flex: 1,
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 16px',
                color: 'var(--text-heading)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            
            <button 
              className="btn btn-secondary btn-icon-only" 
              onClick={handleVoiceSimulate}
              style={{ color: isListening ? 'var(--color-error)' : 'var(--text-muted)' }}
              title="Voice Assistant Simulator"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button 
              className="btn btn-primary btn-icon-only" 
              onClick={() => handleQuery(inputText)}
            >
              <Send size={16} />
            </button>
          </div>
        </Card>

        {/* SIDE BAR SUGGESTED ACTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Voice Indicator Waveform */}
          {isListening && (
            <Card variant="glowing" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-error)' }}>Voice Mode: Listening...</span>
              
              {/* Pulsing bars animation */}
              <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(bar => (
                  <div 
                    key={bar}
                    style={{
                      width: '4px',
                      height: '100%',
                      background: 'var(--primary)',
                      borderRadius: '2px',
                      animation: `voicePulse 1.2s infinite ease-in-out`,
                      animationDelay: `${bar * 0.15}s`
                    }}
                  />
                ))}
              </div>

              {/* CSS rules for voice pulse bars */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes voicePulse {
                  0%, 100% { transform: scaleY(0.2); }
                  50% { transform: scaleY(1); }
                }
              ` }} />
              
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Saying: "Can I afford a PS5 next month?"</span>
            </Card>
          )}

          <Card>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: 'var(--color-warning)' }} />
              <span>Suggested Queries</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '10px', whiteSpace: 'normal', textAlign: 'left' }}
                onClick={() => handleQuery("Can I afford a PS5 next month?")}
              >
                Can I afford a PS5 next month?
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '10px', whiteSpace: 'normal', textAlign: 'left' }}
                onClick={() => handleQuery("Why did I spend so much this week?")}
              >
                Why did I spend so much this week?
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '10px', whiteSpace: 'normal', textAlign: 'left' }}
                onClick={() => handleQuery("Show restaurant expenses")}
              >
                Show restaurant expenses
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '10px', whiteSpace: 'normal', textAlign: 'left' }}
                onClick={() => handleQuery("How much can I invest monthly?")}
              >
                How much can I invest monthly?
              </button>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};
