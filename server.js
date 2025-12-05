require('dotenv').config();
const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const TV_IP = process.env.TV_IP;
const TV_PSK = process.env.TV_PSK;

if (!TV_IP) {
  console.error('❌ Ошибка: TV_IP не указан в .env файле');
  process.exit(1);
}

app.use(express.json());
app.use(express.static('public'));

// Карта IRCC кодов для Sony Bravia
const IRCC_CODES = {
  // Питание
  'Power': 'AAAAAQAAAAEAAAAVAw==',
  'PowerOff': 'AAAAAQAAAAEAAAAvAw==',
  'PowerOn': 'AAAAAQAAAAEAAAAuAw==',
  
  // Цифры
  'Num1': 'AAAAAQAAAAEAAAAAAw==',
  'Num2': 'AAAAAQAAAAEAAAABAw==',
  'Num3': 'AAAAAQAAAAEAAAACAw==',
  'Num4': 'AAAAAQAAAAEAAAADAw==',
  'Num5': 'AAAAAQAAAAEAAAAEAw==',
  'Num6': 'AAAAAQAAAAEAAAAFAw==',
  'Num7': 'AAAAAQAAAAEAAAAGAw==',
  'Num8': 'AAAAAQAAAAEAAAAHAw==',
  'Num9': 'AAAAAQAAAAEAAAAIAw==',
  'Num0': 'AAAAAQAAAAEAAAAJAw==',
  
  // Навигация
  'Up': 'AAAAAQAAAAEAAAB0Aw==',
  'Down': 'AAAAAQAAAAEAAAB1Aw==',
  'Left': 'AAAAAQAAAAEAAAA0Aw==',
  'Right': 'AAAAAQAAAAEAAAAzAw==',
  'Confirm': 'AAAAAQAAAAEAAABlAw==',
  'Return': 'AAAAAgAAAJcAAAAjAw==',
  'Home': 'AAAAAQAAAAEAAABgAw==',
  
  // Громкость
  'VolumeUp': 'AAAAAQAAAAEAAAASAw==',
  'VolumeDown': 'AAAAAQAAAAEAAAATAw==',
  'Mute': 'AAAAAQAAAAEAAAAUAw==',
  
  // Каналы
  'ChannelUp': 'AAAAAQAAAAEAAAAQAw==',
  'ChannelDown': 'AAAAAQAAAAEAAAARAw==',
  
  // Воспроизведение
  'Play': 'AAAAAgAAAJcAAAAaAw==',
  'Pause': 'AAAAAgAAAJcAAAAZAw==',
  'Stop': 'AAAAAgAAAJcAAAAYAw==',
  
  // Дополнительно
  'Input': 'AAAAAQAAAAEAAAAlAw==',
  'Guide': 'AAAAAgAAAKQAAABbAw==',
  'Options': 'AAAAAgAAAJcAAAA2Aw==',
  'Display': 'AAAAAQAAAAEAAAA6Aw==',
  
  // Netflix / Apps (если поддерживается)
  'Netflix': 'AAAAAgAAABoAAAB8Aw==',
  'ActionMenu': 'AAAAAgAAAMQAAABLAw=='
};

// Функция отправки IRCC команды
async function sendIRCCCommand(code) {
  const soapBody = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">
      <IRCCCode>${code}</IRCCCode>
    </u:X_SendIRCC>
  </s:Body>
</s:Envelope>`;

  const headers = {
    'Content-Type': 'text/xml; charset=UTF-8',
    'SOAPACTION': '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
  };

  // Если указан PSK, используем его для аутентификации
  if (TV_PSK) {
    headers['X-Auth-PSK'] = TV_PSK;
  }

  try {
    const response = await axios.post(
      `http://${TV_IP}/sony/IRCC`,
      soapBody,
      { headers, timeout: 5000 }
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Ошибка отправки команды:', error.message);
    if (error.response) {
      return { 
        success: false, 
        error: `HTTP ${error.response.status}: ${error.response.statusText}`,
        details: error.response.data
      };
    }
    return { success: false, error: error.message };
  }
}

// API endpoint для отправки команды
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Команда не указана' });
  }

  const irccCode = IRCC_CODES[command];
  
  if (!irccCode) {
    return res.status(400).json({ error: `Неизвестная команда: ${command}` });
  }

  console.log(`📡 Отправка команды: ${command}`);
  const result = await sendIRCCCommand(irccCode);
  
  if (result.success) {
    res.json({ success: true, command });
  } else {
    res.status(500).json({ success: false, error: result.error, details: result.details });
  }
});

// Получить список доступных команд
app.get('/api/commands', (req, res) => {
  res.json({ commands: Object.keys(IRCC_CODES) });
});

// API endpoint для отправки текста (буквы)
app.post('/api/text', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Текст не указан' });
  }

  console.log(`📝 Отправка текста: ${text}`);
  
  // Для каждого символа отправляем соответствующую команду
  // Sony Bravia не поддерживает прямой ввод текста через IRCC
  // Это демо-версия, в реальности нужно использовать Android TV API
  
  res.json({ 
    success: true, 
    text,
    note: 'Ввод текста требует Android TV API. IRCC не поддерживает текстовый ввод напрямую.' 
  });
});

// Проверка связи с ТВ
app.get('/api/status', async (req, res) => {
  try {
    // Просто проверяем доступность HTTP-сервера ТВ без отправки команды
    const response = await axios.get(
      `http://${TV_IP}/sony/`, 
      { 
        timeout: 2000, 
        validateStatus: () => true,
        headers: TV_PSK ? { 'X-Auth-PSK': TV_PSK } : {}
      }
    );
    
    // Если получили любой HTTP ответ, значит ТВ доступен
    const connected = response.status !== undefined && response.status < 500;
    
    res.json({ 
      connected: connected,
      tv_ip: TV_IP,
      psk_configured: !!TV_PSK,
      http_status: response.status
    });
  } catch (error) {
    // Даже если ошибка, но это не сетевая ошибка - ТВ может быть доступен
    if (error.response) {
      res.json({ 
        connected: true, 
        tv_ip: TV_IP,
        psk_configured: !!TV_PSK,
        http_status: error.response.status
      });
    } else {
      res.json({ 
        connected: false, 
        tv_ip: TV_IP,
        psk_configured: !!TV_PSK,
        error: error.message 
      });
    }
  }
});

// Функция для получения локальных IP адресов
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Пропускаем внутренние и не IPv4 адреса
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  
  return ips;
}

app.listen(PORT, () => {
  const localIPs = getLocalIPs();
  
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🎮 Sony Bravia Web Remote запущен           ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║   📺 TV IP: ${TV_IP.padEnd(31)} ║`);
  console.log(`║   🔑 PSK: ${(TV_PSK ? '✓ Настроен' : '✗ Не указан').padEnd(33)} ║`);
  console.log(`║   🌐 Порт: ${PORT.toString().padEnd(34)} ║`);
  console.log('╠════════════════════════════════════════════════╣');
  console.log('║   📱 Откройте в браузере:                      ║');
  console.log(`║   → http://localhost:${PORT.toString().padEnd(29)} ║`);
  
  if (localIPs.length > 0) {
    localIPs.forEach((ip, index) => {
      if (index === 0) {
        console.log(`║   → http://${ip.address}:${PORT}${' '.repeat(48 - ip.address.length - PORT.toString().length - 13)} ║`);
      } else {
        console.log(`║   → http://${ip.address}:${PORT}${' '.repeat(48 - ip.address.length - PORT.toString().length - 13)} ║`);
      }
    });
  }
  
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  
  if (localIPs.length > 0) {
    console.log('💡 Для доступа с других устройств используйте:');
    localIPs.forEach(ip => {
      console.log(`   http://${ip.address}:${PORT} (${ip.name})`);
    });
    console.log('');
  }
});
