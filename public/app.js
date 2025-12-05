// Проверка статуса при загрузке
async function checkStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    const indicator = document.getElementById('statusCorner');
    
    if (data.connected) {
      indicator.className = 'status-corner connected';
      indicator.title = `Подключено к ${data.tv_ip}`;
    } else {
      indicator.className = 'status-corner disconnected';
      indicator.title = `Не подключено к ${data.tv_ip}`;
    }
  } catch (error) {
    const indicator = document.getElementById('statusCorner');
    indicator.className = 'status-corner disconnected';
    indicator.title = 'Ошибка подключения к серверу';
  }
}

// Отправка команды на ТВ
async function sendCommand(command) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = `Отправка команды: ${command}...`;
  messageEl.className = 'message';
  
  // Вибрация на мобильных устройствах
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  
  try {
    const response = await fetch('/api/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageEl.textContent = `✓ Команда "${command}" отправлена`;
      messageEl.className = 'message success';
    } else {
      messageEl.textContent = `✗ Ошибка: ${data.error}`;
      messageEl.className = 'message error';
    }
  } catch (error) {
    messageEl.textContent = `✗ Ошибка отправки: ${error.message}`;
    messageEl.className = 'message error';
  }
  
  // Очистка сообщения через 3 секунды
  setTimeout(() => {
    messageEl.textContent = '';
    messageEl.className = 'message';
  }, 3000);
}

// Поддержка клавиатуры
document.addEventListener('keydown', (event) => {
  const keyMap = {
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'Enter': 'Confirm',
    'Escape': 'Return',
    'Backspace': 'Return',
    ' ': 'Pause',
    'p': 'Play',
    's': 'Stop',
    'h': 'Home',
    'm': 'Mute',
    '+': 'VolumeUp',
    '-': 'VolumeDown',
    '=': 'VolumeUp',
    '_': 'VolumeDown'
  };
  
  // Цифры
  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault();
    sendCommand(`Num${event.key}`);
    return;
  }
  
  const command = keyMap[event.key];
  if (command) {
    event.preventDefault();
    sendCommand(command);
  }
});

// Проверка статуса при загрузке и каждые 30 секунд
checkStatus();
setInterval(checkStatus, 30000);

// Функция открытия/закрытия цифровой клавиатуры
function toggleNumberKeyboard() {
  const keyboard = document.getElementById('numberKeyboard');
  keyboard.classList.toggle('open');
  
  // Вибрация
  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
}

// Закрытие клавиатуры при клике на фон
document.addEventListener('click', (event) => {
  const numberKeyboard = document.getElementById('numberKeyboard');
  
  if (event.target === numberKeyboard) {
    toggleNumberKeyboard();
  }
});

