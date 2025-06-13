// Estado de la aplicación
let salaryConfig = {
    baseSalary: 0,
    overtimeRate: 0,
    normalHours: 8
};

let workHistory = [];
const COMPANY_ID = 'empresa_giannoni'; // Cambiar por un ID único de tu empresa

// Funciones de Firebase
const saveToFirebase = async (collection, data) => {
    try {
        if (!window.db) {
            // Fallback a localStorage si Firebase no está disponible
            localStorage.setItem(`${COMPANY_ID}_${collection}`, JSON.stringify(data));
            return;
        }
        
        const { doc, setDoc } = window.firestore;
        await setDoc(doc(window.db, 'companies', COMPANY_ID, collection, 'data'), data);
        console.log(`✅ Datos guardados en Firebase: ${collection}`);
    } catch (error) {
        console.error('Error guardando en Firebase:', error);
        // Fallback a localStorage
        localStorage.setItem(`${COMPANY_ID}_${collection}`, JSON.stringify(data));
    }
};

const loadFromFirebase = async (collection) => {
    try {
        if (!window.db) {
            // Fallback a localStorage si Firebase no está disponible
            const stored = localStorage.getItem(`${COMPANY_ID}_${collection}`);
            return stored ? JSON.parse(stored) : null;
        }
        
        const { doc, getDoc } = window.firestore;
        const docRef = doc(window.db, 'companies', COMPANY_ID, collection, 'data');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log(`✅ Datos cargados desde Firebase: ${collection}`);
            return docSnap.data();
        } else {
            // Si no existe en Firebase, intentar cargar desde localStorage
            const stored = localStorage.getItem(`${COMPANY_ID}_${collection}`);
            if (stored) {
                const data = JSON.parse(stored);
                // Migrar a Firebase
                await saveToFirebase(collection, data);
                return data;
            }
            return null;
        }
    } catch (error) {
        console.error('Error cargando desde Firebase:', error);
        // Fallback a localStorage
        const stored = localStorage.getItem(`${COMPANY_ID}_${collection}`);
        return stored ? JSON.parse(stored) : null;
    }
};

// ===== CHAT INTELIGENTE =====

// Variables del chat
let chatHistory = [];
let isTyping = false;

// Configuración de Hugging Face
const HF_API_URL = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';

// Función para consultar Hugging Face
async function queryHuggingFace(message) {
    try {
        // Preparar contexto con datos relevantes
        const contextData = prepareContextData();
        const prompt = `Contexto: ${contextData}\n\nPregunta del usuario: ${message}\n\nRespuesta:`;
        
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: 150,
                    temperature: 0.7,
                    do_sample: true,
                    return_full_text: false
                }
            })
        });
        
        if (!response.ok) {
            console.log('❌ Error en API de Hugging Face:', response.status);
            return null;
        }
        
        const result = await response.json();
        
        if (result && result[0] && result[0].generated_text) {
            return {
                text: result[0].generated_text.trim(),
                enhanced: true
            };
        }
        
        return null;
        
    } catch (error) {
        console.log('🔄 Error con Hugging Face:', error.message);
        return null;
    }
}

// Preparar contexto de datos para la IA
function prepareContextData() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = workHistory.filter(record => {
        const [year, month, day] = record.date.split('-');
        const recordDate = new Date(year, month - 1, day);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const totalDays = monthlyRecords.length;
    const totalOvertime = monthlyRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const totalEarnings = totalOvertime * (salaryConfig.overtimeRate || 0);
    const weekendDays = monthlyRecords.filter(r => {
        const [year, month, day] = r.date.split('-');
        const date = new Date(year, month - 1, day);
        return date.getDay() === 0 || date.getDay() === 6;
    }).length;
    
    return `Datos del empleado este mes: ${totalDays} días trabajados, ${totalOvertime.toFixed(1)} horas extra, $${totalEarnings.toLocaleString('es-AR')} dinero extra, ${weekendDays} fines de semana trabajados. Sueldo base: $${(salaryConfig.baseSalary || 0).toLocaleString('es-AR')}, valor hora extra: $${(salaryConfig.overtimeRate || 0).toLocaleString('es-AR')}.`;
}

// Inicializar chat
function initializeChat() {
    const chatButton = document.getElementById('chatButton');
    const chatModal = document.getElementById('chatModal');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const suggestions = document.querySelectorAll('.suggestion-chip');

    // Abrir/cerrar chat
    chatButton.addEventListener('click', () => {
        chatModal.classList.toggle('show');
        chatButton.classList.toggle('active');
        if (chatModal.classList.contains('show')) {
            chatInput.focus();
        }
    });

    chatClose.addEventListener('click', () => {
        chatModal.classList.remove('show');
        chatButton.classList.remove('active');
    });

    // Enviar mensaje con Enter
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isTyping) {
            const message = chatInput.value.trim();
            if (message) {
                sendMessage(message);
                chatInput.value = '';
            }
        }
    });

    // Sugerencias de preguntas
    suggestions.forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.getAttribute('data-question');
            sendMessage(question);
        });
    });
}

// Enviar mensaje
function sendMessage(message) {
    if (isTyping) return;
    
    // Agregar mensaje del usuario
    addMessage(message, 'user');
    
    // Mostrar indicador de escritura
    showTypingIndicator();
    
    // Procesar respuesta (async para IA)
    setTimeout(async () => {
        try {
            const response = await processMessage(message);
            hideTypingIndicator();
            
            // Agregar indicador si es respuesta mejorada con IA
            const enhancedText = response.enhanced 
                ? response.text 
                : response.text;
                
            addMessage(enhancedText, 'bot', response.chart);
        } catch (error) {
            hideTypingIndicator();
            addMessage('❌ Hubo un error procesando tu pregunta. Inténtalo de nuevo.', 'bot');
        }
    }, 800 + Math.random() * 800); // 0.8-1.6 segundos
}

// Agregar mensaje al chat
function addMessage(text, sender, chartData = null) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message message-${sender}`;
    
    let content = `<div class="message-bubble">${text}</div>`;
    
    // Agregar gráfico si existe
    if (chartData) {
        content += `<div class="chart-container">
            <div class="mini-chart" id="chart-${Date.now()}">
                ${generateMiniChart(chartData)}
            </div>
        </div>`;
    }
    
    messageDiv.innerHTML = content;
    messagesContainer.appendChild(messageDiv);
    
    // Scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Guardar en historial
    chatHistory.push({ text, sender, timestamp: new Date() });
}

// Mostrar indicador de escritura
function showTypingIndicator() {
    isTyping = true;
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message message-bot';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-bubble">
            <i class="fas fa-circle" style="animation: pulse 1.5s infinite; font-size: 8px; margin-right: 5px;"></i>
            <i class="fas fa-circle" style="animation: pulse 1.5s infinite 0.3s; font-size: 8px; margin-right: 5px;"></i>
            <i class="fas fa-circle" style="animation: pulse 1.5s infinite 0.6s; font-size: 8px;"></i>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Ocultar indicador de escritura
function hideTypingIndicator() {
    isTyping = false;
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Procesar mensaje y generar respuesta
async function processMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Primero verificar si es una pregunta específica de horas extra
    const localAnalysis = getLocalAnalysis(lowerMessage);
    if (localAnalysis && !localAnalysis.isGeneral) {
        return localAnalysis;
    }
    
    // Si no es específica de horas extra, intentar con Hugging Face
    try {
        const aiResponse = await queryHuggingFace(message);
        if (aiResponse && aiResponse.enhanced) {
            // Agregar un "gancho" para volver al tema principal
            const followUp = getFollowUpQuestion(lowerMessage);
            
            return {
                text: `${aiResponse.text}\n\n${followUp}`,
                enhanced: true
            };
        }
    } catch (error) {
        console.log('🔄 Usando respuesta local para pregunta general');
    }
    
    // Si todo falla, usar respuesta local con gancho
    return {
        text: `${localAnalysis.text}\n\n${getFollowUpQuestion(lowerMessage)}`,
        enhanced: false
    };
}

// Función para generar preguntas de seguimiento relacionadas con horas extra
function getFollowUpQuestion(message) {
    const followUps = [
        "¿Te gustaría saber cuántas horas extra has trabajado este mes?",
        "¿Quieres que te muestre un resumen de tus ganancias?",
        "¿Necesitas ayuda con el cálculo de tus horas trabajadas?",
        "¿Te interesa ver tus estadísticas de trabajo?",
        "¿Quieres que te ayude a organizar tus horas extra?"
    ];
    
    // Si la pregunta es sobre dinero o trabajo, usar un follow-up más específico
    if (message.includes('dinero') || message.includes('pago') || message.includes('ganar')) {
        return "¿Te gustaría ver un resumen de tus ganancias por horas extra?";
    }
    
    if (message.includes('trabajo') || message.includes('trabajar') || message.includes('horas')) {
        return "¿Quieres que te muestre un análisis de tus horas trabajadas?";
    }
    
    // Seleccionar un follow-up aleatorio
    return followUps[Math.floor(Math.random() * followUps.length)];
}

// Análisis local (sistema original)
function getLocalAnalysis(lowerMessage) {
    // Patrones de preguntas específicas de horas extra
    if (lowerMessage.includes('horas extra') && lowerMessage.includes('mes')) {
        return { ...analyzeMonthlyOvertime(), isGeneral: false };
    }
    
    if (lowerMessage.includes('días') && (lowerMessage.includes('trabajó') || lowerMessage.includes('trabajo'))) {
        return { ...analyzeWorkDays(), isGeneral: false };
    }
    
    if (lowerMessage.includes('dinero') || lowerMessage.includes('pago') || lowerMessage.includes('ganó')) {
        return { ...analyzeEarnings(), isGeneral: false };
    }
    
    if (lowerMessage.includes('fin de semana') || lowerMessage.includes('sábado') || lowerMessage.includes('domingo')) {
        return { ...analyzeWeekends(), isGeneral: false };
    }
    
    if (lowerMessage.includes('día') && (lowerMessage.includes('más') || lowerMessage.includes('mayor'))) {
        return { ...analyzeBestDay(), isGeneral: false };
    }
    
    if (lowerMessage.includes('promedio')) {
        return { ...analyzeAverage(), isGeneral: false };
    }

    // Preguntas generales o saludos
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('buenos')) {
        return {
            text: `¡Hola! 👋 ¿En qué puedo ayudarte hoy? Puedo responder sobre tus horas extra, días trabajados, ganancias y más.`,
            chart: null,
            isGeneral: true
        };
    }

    if (lowerMessage.includes('gracias')) {
        return {
            text: `¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?`,
            chart: null,
            isGeneral: true
        };
    }

    if (lowerMessage.includes('ayuda') || lowerMessage.includes('puedes')) {
        return {
            text: `¡Claro! Puedo ayudarte con:

            📊 **Análisis de trabajo:**
            • Horas extra y días trabajados
            • Ganancias y pagos
            • Fines de semana
            • Promedios y estadísticas

            💡 **Preguntas generales:**
            • "¿Cómo va tu día?"
            • "¿Qué tal el trabajo?"
            • "¿Necesitas ayuda?"

            ¿Qué te gustaría saber?`,
            chart: null,
            isGeneral: true
        };
    }
    
    // Respuesta por defecto más amigable
    return {
        text: `Entiendo tu pregunta. Aunque soy especialista en horas extra, puedo ayudarte con cualquier tema. ¿Qué te gustaría saber?`,
        chart: null,
        isGeneral: true
    };
}

// Análisis de horas extra mensuales
function analyzeMonthlyOvertime() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = workHistory.filter(record => {
        const [year, month, day] = record.date.split('-');
        const recordDate = new Date(year, month - 1, day);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const totalOvertime = monthlyRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const totalDays = monthlyRecords.length;
    const averagePerDay = totalDays > 0 ? (totalOvertime / totalDays).toFixed(1) : 0;
    
    const monthName = new Date().toLocaleDateString('es-AR', { month: 'long' });
    
    return {
        text: `📊 **Horas Extra en ${monthName}:**
        
        🕐 **Total:** ${totalOvertime.toFixed(1)} horas
        📅 **Días trabajados:** ${totalDays}
        📈 **Promedio por día:** ${averagePerDay}h
        
        ${totalOvertime > 0 ? '¡Excelente productividad! 💪' : 'Sin horas extra este mes 😊'}`,
        chart: {
            type: 'overtime-monthly',
            data: monthlyRecords.map(r => ({ date: r.date, hours: r.overtimeHours || 0 }))
        }
    };
}

// Análisis de días trabajados
function analyzeWorkDays() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = workHistory.filter(record => {
        const [year, month, day] = record.date.split('-');
        const recordDate = new Date(year, month - 1, day);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const totalDays = monthlyRecords.length;
    const daysWithOvertime = monthlyRecords.filter(r => (r.overtimeHours || 0) > 0).length;
    const weekends = monthlyRecords.filter(r => {
        const [year, month, day] = r.date.split('-');
        const date = new Date(year, month - 1, day);
        return date.getDay() === 0 || date.getDay() === 6;
    }).length;
    
    const monthName = new Date().toLocaleDateString('es-AR', { month: 'long' });
    
    return {
        text: `📅 **Días Trabajados en ${monthName}:**
        
        🗓️ **Total de días:** ${totalDays}
        ⏰ **Días con horas extra:** ${daysWithOvertime}
        🏖️ **Fines de semana:** ${weekends}
        👔 **Días de semana:** ${totalDays - weekends}
        
        ${totalDays > 20 ? '¡Muy buen mes de trabajo! 🌟' : 'Mes tranquilo 😌'}`,
        chart: {
            type: 'work-days',
            data: { total: totalDays, overtime: daysWithOvertime, weekends }
        }
    };
}

// Análisis de ganancias
function analyzeEarnings() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = workHistory.filter(record => {
        const [year, month, day] = record.date.split('-');
        const recordDate = new Date(year, month - 1, day);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const totalOvertime = monthlyRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const extraMoney = totalOvertime * (salaryConfig.overtimeRate || 0);
    const totalSalary = (salaryConfig.baseSalary || 0) + extraMoney;
    
    const monthName = new Date().toLocaleDateString('es-AR', { month: 'long' });
    
    return {
        text: `💰 **Ganancias en ${monthName}:**
        
        💵 **Sueldo base:** $${(salaryConfig.baseSalary || 0).toLocaleString('es-AR')}
        ⭐ **Dinero extra:** $${extraMoney.toLocaleString('es-AR')}
        🎯 **Total del mes:** $${totalSalary.toLocaleString('es-AR')}
        
        📊 **Horas extra:** ${totalOvertime.toFixed(1)}h × $${(salaryConfig.overtimeRate || 0).toLocaleString('es-AR')}
        
        ${extraMoney > 0 ? '¡Excelente mes! 🚀' : 'Mes sin extras 😊'}`,
        chart: {
            type: 'earnings',
            data: { base: salaryConfig.baseSalary || 0, extra: extraMoney, total: totalSalary }
        }
    };
}

// Análisis de fines de semana
function analyzeWeekends() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const weekendRecords = workHistory.filter(record => {
        const [year, month, day] = record.date.split('-');
        const recordDate = new Date(year, month - 1, day);
        const isCurrentMonth = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        const isWeekend = recordDate.getDay() === 0 || recordDate.getDay() === 6;
        return isCurrentMonth && isWeekend;
    });
    
    const totalWeekendHours = weekendRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const weekendDays = weekendRecords.length;
    
    const monthName = new Date().toLocaleDateString('es-AR', { month: 'long' });
    
    return {
        text: `🏖️ **Fines de Semana en ${monthName}:**
        
        📅 **Días trabajados:** ${weekendDays}
        🕐 **Total de horas:** ${totalWeekendHours.toFixed(1)}h
        ⭐ **Todas son horas extra:** ${totalWeekendHours.toFixed(1)}h
        💰 **Dinero extra:** $${(totalWeekendHours * (salaryConfig.overtimeRate || 0)).toLocaleString('es-AR')}
        
        ${weekendDays > 0 ? '¡Dedicación extra! 💪' : 'Sin trabajo en fines de semana 😌'}`,
        chart: {
            type: 'weekends',
            data: weekendRecords.map(r => ({ date: r.date, hours: r.totalHours || 0 }))
        }
    };
}

// Análisis del mejor día
function analyzeBestDay() {
    if (workHistory.length === 0) {
        return {
            text: '📊 No hay registros de trabajo aún.',
            chart: null
        };
    }
    
    const bestDay = workHistory.reduce((best, current) => {
        return (current.totalHours || 0) > (best.totalHours || 0) ? current : best;
    });
    
    const [year, month, day] = bestDay.date.split('-');
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    return {
        text: `🏆 **Día con Más Horas:**
        
        📅 **Fecha:** ${dayName}
        🕐 **Total trabajado:** ${bestDay.totalHours}h
        ⭐ **Horas extra:** ${bestDay.overtimeHours}h
        ${isWeekend ? '🏖️ **Fin de semana**' : '👔 **Día de semana**'}
        
        ¡Récord de productividad! 🌟`,
        chart: null
    };
}

// Análisis de promedio
function analyzeAverage() {
    if (workHistory.length === 0) {
        return {
            text: '📊 No hay registros de trabajo aún.',
            chart: null
        };
    }
    
    const totalHours = workHistory.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalOvertime = workHistory.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const totalDays = workHistory.length;
    
    const avgTotal = (totalHours / totalDays).toFixed(1);
    const avgOvertime = (totalOvertime / totalDays).toFixed(1);
    
    return {
        text: `📊 **Promedios Generales:**
        
        🕐 **Horas por día:** ${avgTotal}h
        ⭐ **Horas extra por día:** ${avgOvertime}h
        📅 **Total de días:** ${totalDays}
        
        📈 **Totales:**
        • ${totalHours.toFixed(1)}h trabajadas
        • ${totalOvertime.toFixed(1)}h extra
        
        ¡Buen ritmo de trabajo! 👍`,
        chart: {
            type: 'averages',
            data: { avgTotal: parseFloat(avgTotal), avgOvertime: parseFloat(avgOvertime) }
        }
    };
}

// Generar mini gráfico
function generateMiniChart(chartData) {
    if (!chartData) return '';
    
    switch (chartData.type) {
        case 'overtime-monthly':
            return generateOvertimeChart(chartData.data);
        case 'work-days':
            return generateWorkDaysChart(chartData.data);
        case 'earnings':
            return generateEarningsChart(chartData.data);
        case 'weekends':
            return generateWeekendsChart(chartData.data);
        case 'averages':
            return generateAveragesChart(chartData.data);
        default:
            return '';
    }
}

// Gráfico de horas extra mensuales
function generateOvertimeChart(data) {
    if (!data || data.length === 0) return '<p style="text-align: center; color: #999;">Sin datos</p>';
    
    const maxHours = Math.max(...data.map(d => d.hours));
    const bars = data.slice(-7).map(d => {
        const height = maxHours > 0 ? (d.hours / maxHours) * 80 : 0;
        const date = new Date(d.date).getDate();
        return `
            <div style="display: inline-block; width: 30px; margin: 0 2px; text-align: center;">
                <div style="height: 80px; display: flex; align-items: end;">
                    <div style="width: 100%; height: ${height}px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 3px;"></div>
                </div>
                <small style="font-size: 10px; color: #666;">${date}</small>
            </div>
        `;
    }).join('');
    
    return `
        <div style="text-align: center; padding: 10px;">
            <small style="color: #666; font-size: 11px;">Últimos 7 días - Horas extra</small>
            <div style="margin-top: 10px;">${bars}</div>
        </div>
    `;
}

// Gráfico de días trabajados
function generateWorkDaysChart(data) {
    const total = data.total || 0;
    const overtime = data.overtime || 0;
    const weekends = data.weekends || 0;
    
    return `
        <div style="display: flex; justify-content: space-around; text-align: center; padding: 10px;">
            <div>
                <div style="width: 40px; height: 40px; background: #667eea; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${total}</div>
                <small style="font-size: 10px; color: #666;">Total</small>
            </div>
            <div>
                <div style="width: 40px; height: 40px; background: #764ba2; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${overtime}</div>
                <small style="font-size: 10px; color: #666;">Con extra</small>
            </div>
            <div>
                <div style="width: 40px; height: 40px; background: #ff6b6b; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${weekends}</div>
                <small style="font-size: 10px; color: #666;">Fines</small>
            </div>
        </div>
    `;
}

// Gráfico de ganancias
function generateEarningsChart(data) {
    const base = data.base || 0;
    const extra = data.extra || 0;
    const total = data.total || 0;
    
    const basePercent = total > 0 ? (base / total) * 100 : 0;
    const extraPercent = total > 0 ? (extra / total) * 100 : 0;
    
    return `
        <div style="padding: 10px;">
            <div style="display: flex; height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 10px;">
                <div style="width: ${basePercent}%; background: #667eea;"></div>
                <div style="width: ${extraPercent}%; background: #764ba2;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #667eea;">● Base: ${basePercent.toFixed(0)}%</span>
                <span style="color: #764ba2;">● Extra: ${extraPercent.toFixed(0)}%</span>
            </div>
        </div>
    `;
}

// Gráfico de fines de semana
function generateWeekendsChart(data) {
    if (!data || data.length === 0) return '<p style="text-align: center; color: #999;">Sin trabajo en fines de semana</p>';
    
    const maxHours = Math.max(...data.map(d => d.hours));
    const bars = data.map(d => {
        const height = maxHours > 0 ? (d.hours / maxHours) * 60 : 0;
        const date = new Date(d.date).getDate();
        return `
            <div style="display: inline-block; width: 25px; margin: 0 1px; text-align: center;">
                <div style="height: 60px; display: flex; align-items: end;">
                    <div style="width: 100%; height: ${height}px; background: #ff6b6b; border-radius: 2px;"></div>
                </div>
                <small style="font-size: 9px; color: #666;">${date}</small>
            </div>
        `;
    }).join('');
    
    return `
        <div style="text-align: center; padding: 10px;">
            <small style="color: #666; font-size: 11px;">Horas en fines de semana</small>
            <div style="margin-top: 10px; overflow-x: auto;">${bars}</div>
        </div>
    `;
}

// Gráfico de promedios
function generateAveragesChart(data) {
    const avgTotal = data.avgTotal || 0;
    const avgOvertime = data.avgOvertime || 0;
    
    const totalHeight = Math.min((avgTotal / 12) * 60, 60); // Max 12 horas
    const overtimeHeight = Math.min((avgOvertime / 6) * 60, 60); // Max 6 horas extra
    
    return `
        <div style="display: flex; justify-content: space-around; align-items: end; height: 80px; padding: 10px;">
            <div style="text-align: center;">
                <div style="width: 30px; height: ${totalHeight}px; background: #667eea; border-radius: 3px; margin: 0 auto;"></div>
                <small style="font-size: 10px; color: #666; margin-top: 5px; display: block;">${avgTotal}h total</small>
            </div>
            <div style="text-align: center;">
                <div style="width: 30px; height: ${overtimeHeight}px; background: #764ba2; border-radius: 3px; margin: 0 auto;"></div>
                <small style="font-size: 10px; color: #666; margin-top: 5px; display: block;">${avgOvertime}h extra</small>
            </div>
        </div>
    `;
}

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    await loadDataFromStorage();
    initializeEventListeners();
    updateDisplay();
    setDefaultDate();
    populateMonthFilter();
    
    // Configurar sincronización en tiempo real
    setupRealtimeSync();
    initializeChat();
});

// Event listeners
function initializeEventListeners() {
    document.getElementById('saveSalaryConfig').addEventListener('click', saveSalaryConfig);
    document.getElementById('addWorkDay').addEventListener('click', addWorkDay);
    document.getElementById('clearHistory').addEventListener('click', clearHistory);
    document.getElementById('monthFilter').addEventListener('change', filterByMonth);
    
    // Auto-save salary config on input change
    document.getElementById('baseSalary').addEventListener('input', debounce(saveSalaryConfig, 1000));
    document.getElementById('normalHours').addEventListener('input', debounce(saveSalaryConfig, 1000));
    document.getElementById('overtimeRate').addEventListener('input', debounce(saveSalaryConfig, 1000));
}

// Establecer fecha por defecto
function setDefaultDate() {
    const today = new Date();
    // Asegurar que usamos la zona horaria local
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    document.getElementById('workDate').value = dateString;
}

// Cargar datos desde Firebase
async function loadDataFromStorage() {
    try {
        // Cargar configuración de sueldo
        const storedSalaryConfig = await loadFromFirebase('salaryConfig');
        if (storedSalaryConfig) {
            salaryConfig = storedSalaryConfig;
            document.getElementById('baseSalary').value = salaryConfig.baseSalary || 0;
            document.getElementById('normalHours').value = salaryConfig.normalHours || 8;
            document.getElementById('overtimeRate').value = salaryConfig.overtimeRate || 0;
        } else {
            // Valores por defecto
            document.getElementById('normalHours').value = 8;
        }
        
        // Cargar historial de trabajo
        const storedWorkHistory = await loadFromFirebase('workHistory');
        if (storedWorkHistory && storedWorkHistory.history) {
            workHistory = storedWorkHistory.history;
        }
    } catch (error) {
        console.error('Error loading data from storage:', error);
    }
}

// Configurar sincronización en tiempo real
function setupRealtimeSync() {
    if (!window.db || !window.firestore.onSnapshot) return;
    
    try {
        const { doc, onSnapshot } = window.firestore;
        
        // Escuchar cambios en el historial de trabajo
        const workHistoryRef = doc(window.db, 'companies', COMPANY_ID, 'workHistory', 'data');
        onSnapshot(workHistoryRef, (doc) => {
            if (doc.exists() && doc.data().history) {
                const newHistory = doc.data().history;
                // Solo actualizar si hay cambios
                if (JSON.stringify(newHistory) !== JSON.stringify(workHistory)) {
                    workHistory = newHistory;
                    updateDisplay();
                    populateMonthFilter();
                    console.log('🔄 Historial sincronizado desde otro dispositivo');
                }
            }
        });
        
        // Escuchar cambios en la configuración de sueldo
        const salaryConfigRef = doc(window.db, 'companies', COMPANY_ID, 'salaryConfig', 'data');
        onSnapshot(salaryConfigRef, (doc) => {
            if (doc.exists()) {
                const newConfig = doc.data();
                if (JSON.stringify(newConfig) !== JSON.stringify(salaryConfig)) {
                    salaryConfig = newConfig;
                    document.getElementById('baseSalary').value = salaryConfig.baseSalary || 0;
                    document.getElementById('normalHours').value = salaryConfig.normalHours || 8;
                    document.getElementById('overtimeRate').value = salaryConfig.overtimeRate || 0;
                    updateDisplay();
                    console.log('🔄 Configuración sincronizada desde otro dispositivo');
                }
            }
        });
        
        console.log('🔄 Sincronización en tiempo real activada');
    } catch (error) {
        console.error('Error configurando sincronización:', error);
    }
}

// Guardar configuración de sueldo
async function saveSalaryConfig() {
    const baseSalary = parseFloat(document.getElementById('baseSalary').value) || 0;
    const normalHours = parseFloat(document.getElementById('normalHours').value) || 8;
    const overtimeRate = parseFloat(document.getElementById('overtimeRate').value) || 0;
    
    salaryConfig = { baseSalary, normalHours, overtimeRate };
    
    try {
        await saveToFirebase('salaryConfig', salaryConfig);
        showSuccessMessage('Configuración de sueldo guardada correctamente');
        updateDisplay();
    } catch (error) {
        console.error('Error saving salary config:', error);
        alert('Error al guardar la configuración');
    }
}

// Agregar día de trabajo
async function addWorkDay() {
    const workDate = document.getElementById('workDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!workDate || !startTime || !endTime) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    if (startTime >= endTime) {
        alert('La hora de salida debe ser posterior a la hora de entrada');
        return;
    }
    
    // Verificar si ya existe un registro para esa fecha
    const existingRecord = workHistory.find(record => record.date === workDate);
    if (existingRecord) {
        if (!confirm('Ya existe un registro para esta fecha. ¿Deseas actualizarlo?')) {
            return;
        }
        // Eliminar el registro existente
        workHistory = workHistory.filter(record => record.date !== workDate);
    }
    
    const workDay = {
        date: workDate,
        startTime: startTime,
        endTime: endTime,
        totalHours: calculateTotalHours(startTime, endTime),
        overtimeHours: calculateOvertimeHours(startTime, endTime, workDate)
    };
    
    workHistory.push(workDay);
    workHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    try {
        await saveToFirebase('workHistory', { history: workHistory });
        showSuccessMessage('Día de trabajo agregado correctamente');
        updateDisplay();
        clearForm();
        populateMonthFilter();
    } catch (error) {
        console.error('Error saving work day:', error);
        alert('Error al guardar el día de trabajo');
    }
}

// Calcular total de horas trabajadas
function calculateTotalHours(startTime, endTime) {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const diffMs = end - start;
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Redondear a 2 decimales
}

// Calcular horas extras
function calculateOvertimeHours(startTime, endTime, workDate) {
    const totalHours = calculateTotalHours(startTime, endTime);
    
    // Verificar si es fin de semana (sábado=6, domingo=0)
    let isWeekend = false;
    if (workDate) {
        const [year, month, day] = workDate.split('-');
        const dateObj = new Date(year, month - 1, day);
        isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    }
    
    let overtimeHours;
    if (isWeekend) {
        // Fin de semana: todas las horas son extra
        overtimeHours = totalHours;
    } else {
        // Día de semana: usar lógica normal
        const normalHours = salaryConfig.normalHours || 8;
        overtimeHours = Math.max(0, totalHours - normalHours);
    }
    
    return Math.round(overtimeHours * 100) / 100;
}

// Actualizar la visualización
function updateDisplay() {
    updateMonthlySummary();
    updateWorkHistoryTable();
}

// Actualizar resumen mensual
function updateMonthlySummary() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthRecords = workHistory.filter(record => {
        // Evitar problemas de timezone
        const [year, month, day] = record.date.split('-');
        const recordDate = new Date(year, month - 1, day);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const totalDays = currentMonthRecords.length;
    const normalHours = salaryConfig.normalHours || 8;
    
    // Calcular horas normales excluyendo fines de semana
    const totalNormalHours = currentMonthRecords.reduce((sum, record) => {
        // Verificar si es fin de semana
        const [year, month, day] = record.date.split('-');
        const dateObj = new Date(year, month - 1, day);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        
        if (isWeekend) {
            // Fin de semana: 0 horas normales
            return sum;
        } else {
            // Día de semana: calcular horas normales
            return sum + Math.min(record.totalHours, normalHours);
        }
    }, 0);
    
    const totalOvertimeHours = currentMonthRecords.reduce((sum, record) => 
        sum + record.overtimeHours, 0);
    
    const totalSalary = salaryConfig.baseSalary + (totalOvertimeHours * salaryConfig.overtimeRate);
    
    document.getElementById('totalDays').textContent = totalDays;
    document.getElementById('totalNormalHours').textContent = Math.round(totalNormalHours * 100) / 100;
    document.getElementById('totalOvertimeHours').textContent = Math.round(totalOvertimeHours * 100) / 100;
    document.getElementById('totalSalary').textContent = `$${totalSalary.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

// Actualizar tabla de historial
function updateWorkHistoryTable() {
    const tbody = document.getElementById('workHistoryBody');
    const selectedMonth = document.getElementById('monthFilter').value;
    
    let filteredHistory = workHistory;
    
    if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-');
        filteredHistory = workHistory.filter(record => {
            // Evitar problemas de timezone
            const [recordYear, recordMonth, recordDay] = record.date.split('-');
            const recordDate = new Date(recordYear, recordMonth - 1, recordDay);
            return recordDate.getFullYear() == year && recordDate.getMonth() == (month - 1);
        });
    }
    
    if (filteredHistory.length === 0) {
        tbody.innerHTML = '<tr class="no-data"><td colspan="7">No hay registros para mostrar</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredHistory.map(record => {
        // Calcular pago adicional por horas extras
        const overtimePayment = (record.overtimeHours || 0) * (salaryConfig.overtimeRate || 0);
        
        return `
            <tr>
                <td>${formatDate(record.date)}</td>
                <td><span class="time-badge entry">${record.startTime}</span></td>
                <td><span class="time-badge exit">${record.endTime}</span></td>
                <td><span class="hours-badge">${record.totalHours}h</span></td>
                <td><span class="overtime-badge">${record.overtimeHours}h</span></td>
                <td><span class="payment-badge">$${overtimePayment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></td>
                <td>
                    <button class="btn-delete" onclick="deleteWorkDay('${record.date}')" title="Eliminar registro">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Formatear fecha
function formatDate(dateString) {
    // Evitar problemas de timezone creando la fecha de forma local
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-AR', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Eliminar día de trabajo
async function deleteWorkDay(date) {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) {
        return;
    }
    
    workHistory = workHistory.filter(record => record.date !== date);
    
    try {
        await saveToFirebase('workHistory', { history: workHistory });
        showSuccessMessage('Registro eliminado correctamente');
        updateDisplay();
        populateMonthFilter();
    } catch (error) {
        console.error('Error deleting work day:', error);
        alert('Error al eliminar el registro');
    }
}

// Limpiar historial
async function clearHistory() {
    if (!confirm('¿Estás seguro de que deseas eliminar todo el historial? Esta acción no se puede deshacer.')) {
        return;
    }
    
    workHistory = [];
    
    try {
        await saveToFirebase('workHistory', { history: workHistory });
        showSuccessMessage('Historial eliminado correctamente');
        updateDisplay();
        populateMonthFilter();
    } catch (error) {
        console.error('Error clearing history:', error);
        alert('Error al eliminar el historial');
    }
}

// Filtrar por mes
function filterByMonth() {
    updateWorkHistoryTable();
}

// Poblar filtro de meses
function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const months = new Set();
    
    workHistory.forEach(record => {
        // Evitar problemas de timezone
        const [year, month, day] = record.date.split('-');
        const date = new Date(year, month - 1, day);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
    });
    
    const sortedMonths = Array.from(months).sort().reverse();
    
    // Mantener la selección actual
    const currentSelection = monthFilter.value;
    
    monthFilter.innerHTML = '<option value="all">Todos los meses</option>';
    
    sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1);
        const monthName = date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        monthFilter.appendChild(option);
    });
    
    // Restaurar selección si existe
    if (currentSelection && monthFilter.querySelector(`option[value="${currentSelection}"]`)) {
        monthFilter.value = currentSelection;
    }
}

// Limpiar formulario
function clearForm() {
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    setDefaultDate();
}

// Mostrar mensaje de éxito
function showSuccessMessage(message) {
    // Crear elemento de mensaje si no existe
    let successMessage = document.querySelector('.success-message');
    if (!successMessage) {
        successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        document.querySelector('.container').insertBefore(successMessage, document.querySelector('.salary-config'));
    }
    
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// Función de debounce para auto-save
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Exportar datos (funcionalidad adicional)
function exportData() {
    const data = {
        salaryConfig: salaryConfig,
        workHistory: workHistory,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horas-trabajo-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Función para debugging y recalcular registros existentes (GLOBAL)
window.debugAndRecalculateWeekends = function() {
    console.log('🔍 DEPURACIÓN DE FIN DE SEMANA:');
    
    if (!workHistory || workHistory.length === 0) {
        console.log('⚠️ No hay registros en el historial');
        alert('No hay registros para recalcular');
        return;
    }
    
    // Recalcular todos los registros
    workHistory = workHistory.map(record => {
        const oldOvertimeHours = record.overtimeHours;
        const newOvertimeHours = calculateOvertimeHours(record.startTime, record.endTime, record.date);
        
        // Verificar si es fin de semana
        const [year, month, day] = record.date.split('-');
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek];
        
        console.log(`📅 ${record.date} (${dayName}): ${isWeekend ? '🏖️ FIN DE SEMANA' : '👔 Día laboral'}`);
        console.log(`   Horas: ${record.startTime} - ${record.endTime} = ${record.totalHours}h`);
        console.log(`   Horas extra: ${oldOvertimeHours}h → ${newOvertimeHours}h ${oldOvertimeHours !== newOvertimeHours ? '⚠️ CAMBIÓ' : '✅'}`);
        
        return {
            ...record,
            overtimeHours: newOvertimeHours
        };
    });
    
    // Guardar cambios
    saveToFirebase('workHistory', { history: workHistory })
        .then(() => {
            console.log('✅ Recálculo completado y guardado');
            updateDisplay();
            alert('✅ Recálculo completado. Revisa la consola para ver los detalles.');
        })
        .catch(error => {
            console.error('❌ Error guardando:', error);
            alert('❌ Error al guardar los cambios');
        });
};

// Alias corto para la consola
window.recalcular = window.debugAndRecalculateWeekends; 
