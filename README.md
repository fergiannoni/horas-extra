# Control de Horas - Aplicación Web

Una aplicación web moderna y responsive para registrar las horas trabajadas de empleados y calcular su sueldo mensual.

## 🚀 Características

- **Configuración de Sueldo**: Define el sueldo neto mensual y el valor de las horas extras
- **Registro de Horas**: Registra la fecha, hora de entrada y salida para cada día trabajado
- **Cálculo Automático**: Calcula automáticamente las horas normales y extras (más de 8 horas)
- **Resumen Mensual**: Visualiza un resumen en tiempo real del mes actual
- **Historial Completo**: Tabla detallada con todos los registros y filtros por mes
- **Diseño Mobile-First**: Optimizado para dispositivos móviles y desktop
- **Almacenamiento Local**: Los datos se guardan automáticamente en el navegador

## 📱 Uso de la Aplicación

### 1. Configuración Inicial
1. Ingresa el **Sueldo Neto Mensual** en pesos argentinos
2. Define el **Valor de la Hora Extra**
3. Haz clic en "Guardar Configuración" (o se guarda automáticamente)

### 2. Registrar Días de Trabajo
1. Selecciona la **fecha** del día trabajado
2. Ingresa la **hora de entrada** (formato 24h)
3. Ingresa la **hora de salida** (formato 24h)
4. Haz clic en "Agregar Día"

### 3. Visualizar el Resumen
El resumen se actualiza automáticamente y muestra:
- Días trabajados en el mes actual
- Total de horas normales (máximo 8 por día)
- Total de horas extras (más de 8 horas por día)
- **Sueldo total calculado** (sueldo base + horas extras)

### 4. Historial de Trabajo
- Ve todos los registros en una tabla organizada
- Filtra por mes específico
- Elimina registros individuales con el botón 🗑️
- Limpia todo el historial si es necesario

## 🛠️ Instalación

1. Descarga los archivos:
   - `index.html`
   - `styles.css`
   - `script.js`

2. Abre `index.html` en tu navegador web

¡No necesitas servidor web ni instalación adicional!

## 📊 Cálculo de Horas

- **Horas Normales**: Hasta 8 horas por día
- **Horas Extras**: Todo lo que supere las 8 horas diarias
- **Sueldo Total**: Sueldo Base + (Horas Extras × Valor Hora Extra)

## 💾 Almacenamiento de Datos

Los datos se guardan automáticamente en el almacenamiento local del navegador:
- La configuración se guarda al cambiar los valores
- Los registros se guardan al agregar cada día
- Los datos persisten entre sesiones del navegador

## 🎨 Características de Diseño

- **Mobile-First**: Diseñado primero para móviles
- **Responsive**: Se adapta a tablets y desktop
- **Dark Mode**: Soporte automático para modo oscuro
- **Accesibilidad**: Botones de tamaño táctil y colores contrastantes
- **Animaciones Suaves**: Transiciones y efectos visuales

## 🔧 Compatibilidad

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📝 Notas Importantes

- Los datos se almacenan solo en tu navegador local
- No se envía información a servidores externos
- Si limpias los datos del navegador, perderás los registros
- Se recomienda hacer respaldos periódicos exportando los datos

## 🆘 Resolución de Problemas

**Los datos no se guardan:**
- Verifica que el navegador permita almacenamiento local
- No uses modo incógnito/privado

**La página no se ve bien:**
- Actualiza tu navegador a una versión reciente
- Verifica que JavaScript esté habilitado

**Problemas con el cálculo:**
- Asegúrate de que la hora de salida sea posterior a la de entrada
- Verifica que los valores de sueldo sean números válidos 