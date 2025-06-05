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

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    await loadDataFromStorage();
    initializeEventListeners();
    updateDisplay();
    setDefaultDate();
    populateMonthFilter();
    
    // Configurar sincronización en tiempo real
    setupRealtimeSync();
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
    const dateString = today.toISOString().split('T')[0];
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
        overtimeHours: calculateOvertimeHours(startTime, endTime)
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
function calculateOvertimeHours(startTime, endTime) {
    const totalHours = calculateTotalHours(startTime, endTime);
    const normalHours = salaryConfig.normalHours || 8;
    const overtimeHours = Math.max(0, totalHours - normalHours);
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
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const totalDays = currentMonthRecords.length;
    const normalHours = salaryConfig.normalHours || 8;
    const totalNormalHours = currentMonthRecords.reduce((sum, record) => 
        sum + Math.min(record.totalHours, normalHours), 0);
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
            const recordDate = new Date(record.date);
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
    const date = new Date(dateString);
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
        const date = new Date(record.date);
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