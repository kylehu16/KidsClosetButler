const https = require('https')

// 使用 Open-Meteo 免费天气API（无需API key）
// WMO Weather interpretation codes: https://open-meteo.com/en/docs
// WMO Code -> 天气映射
const wmoToWeather = {
  0: '晴天',    // Clear sky
  1: '晴天',    // Mainly clear
  2: '多云',    // Partly cloudy
  3: '多云',    // Overcast
  45: '雾霾',   // Fog
  48: '雾霾',   // Depositing rime fog
  51: '小雨',   // Light drizzle
  53: '小雨',   // Moderate drizzle
  55: '小雨',   // Dense drizzle
  56: '雨夹雪', // Light freezing drizzle
  57: '雨夹雪', // Dense freezing drizzle
  61: '小雨',   // Slight rain
  63: '中雨',   // Moderate rain
  65: '大雨',   // Heavy rain
  66: '雨夹雪', // Light freezing rain
  67: '雨夹雪', // Heavy freezing rain
  71: '小雪',   // Slight snow fall
 73: '中雪',   // Moderate snow fall
 75: '大雪',   // Heavy snow fall
 77: '雪粒',   // Snow grains
 80: '小雨',   // Slight rain showers
  81: '中雨',   // Moderate rain showers
  82: '大雨',   // Violent rain showers
  85: '小雪',   // Slight snow showers
  86: '大雪',   // Heavy snow showers
  95: '雷阵雨', // Thunderstorm
  96: '雷阵雨', // Thunderstorm with slight hail
  99: '雷阵雨'  // Thunderstorm with heavy hail
}

// WMO Code -> 简化天气ID
const wmoToWeatherId = {
  0: 'sunny',
  1: 'sunny',
  2: 'cloudy',
  3: 'cloudy',
  45: 'foggy',
  48: 'foggy',
  51: 'rainy',
  53: 'rainy',
  55: 'rainy',
  56: 'rainy',
  57: 'rainy',
  61: 'rainy',
  63: 'rainy',
  65: 'rainy',
  66: 'rainy',
  67: 'rainy',
  71: 'snowy',
  73: 'snowy',
  75: 'snowy',
  77: 'snowy',
  80: 'rainy',
  81: 'rainy',
  82: 'rainy',
  85: 'snowy',
  86: 'snowy',
  95: 'rainy',
  96: 'rainy',
  99: 'rainy'
}

exports.main = async (event, context) => {
  let { latitude, longitude, city } = event

  // 如果传入了城市名称，先通过地理编码获取经纬度
  if (city && !latitude && !longitude) {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`
      const geoData = await httpGet(geoUrl)
      
      if (geoData.results && geoData.results.length > 0) {
        latitude = geoData.results[0].latitude
        longitude = geoData.results[0].longitude
      } else {
        return {
          code: -1,
          message: '未找到该城市的位置信息'
        }
      }
    } catch (error) {
      return {
        code: -1,
        message: '地理编码失败：' + error.message
      }
    }
  }

  if (!latitude || !longitude) {
    return {
      code: -1,
      message: '缺少位置参数'
    }
  }

  try {
    // 调用 Open-Meteo API 获取当前天气和每日预报
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh`

    const weatherData = await httpGet(apiUrl)

    if (!weatherData || !weatherData.current_weather) {
      return {
        code: -1,
        message: '获取天气数据失败'
      }
    }

    const current = weatherData.current_weather
    const wmoCode = current.weathercode
    const weatherText = wmoToWeather[wmoCode] || '晴天'
    const weatherId = wmoToWeatherId[wmoCode] || 'sunny'
    const temperature = Math.round(current.temperature)

    // 判断是否大风（风速 > 50 km/h）
    const windSpeed = current.windspeed || 0
    const finalWeatherId = windSpeed > 50 ? 'windy' : weatherId

    // 获取未来3天的天气预报
    let dailyForecast = []
    
    if (weatherData.daily && weatherData.daily.time) {
      // 获取未来3天（今天+后两天）
      const days = Math.min(3, weatherData.daily.time.length)
      for (let i = 0; i < days; i++) {
        const weatherCode = weatherData.daily.weathercode ? weatherData.daily.weathercode[i] : wmoCode
        dailyForecast.push({
          date: weatherData.daily.time[i],
          weather: wmoToWeather[weatherCode] || '晴天',
          weatherId: wmoToWeatherId[weatherCode] || 'sunny',
          maxTemp: Math.round(weatherData.daily.temperature_2m_max[i]),
          minTemp: Math.round(weatherData.daily.temperature_2m_min[i])
        })
      }
    }
    
    // 今日温度
    const todayMax = dailyForecast[0] ? dailyForecast[0].maxTemp : temperature
    const todayMin = dailyForecast[0] ? dailyForecast[0].minTemp : temperature
    
    return {
      code: 0,
      message: '获取成功',
      result: {
        weather: weatherText,
        weatherId: finalWeatherId,
        temperature: temperature,
        maxTemp: todayMax,
        minTemp: todayMin,
        windSpeed: windSpeed,
        dailyForecast: dailyForecast // 未来3天预报
      }
    }
  } catch (error) {
    console.error('获取天气失败:', error)
    return {
      code: -1,
      message: error.message || '获取天气失败'
    }
  }
}

// 封装 HTTP GET 请求
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}
