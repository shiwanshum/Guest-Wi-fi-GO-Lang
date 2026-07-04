document.addEventListener('DOMContentLoaded', () => {
    // Views
    const regView = document.getElementById('registration-view');
    const otpView = document.getElementById('otp-view');
    const successView = document.getElementById('success-view');

    // Forms & Buttons
    const regForm = document.getElementById('registration-form');
    const otpForm = document.getElementById('otp-form');
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const verifyBtn = document.getElementById('verify-btn');
    const otpInputs = document.querySelectorAll('.otp-digit');

    // State
    let userMobile = '';

    // Device Info (gathered via UAParser if available, else fallback)
    function getDeviceInfo() {
        let device = "Unknown Device";
        let os = "Unknown OS";
        let browser = "Unknown Browser";

        if (window.UAParser) {
            const parser = new UAParser();
            const result = parser.getResult();
            device = result.device.model ? `${result.device.vendor} ${result.device.model}` : 'Desktop/Laptop';
            os = `${result.os.name} ${result.os.version || ''}`.trim();
            browser = `${result.browser.name} ${result.browser.version || ''}`.trim();
        }

        // Generate a pseudo MAC address for demo purposes
        // In a real scenario, the backend gets the MAC from the controller/firewall via IP mapping
        const pseudoMac = 'XX:XX:XX:' + Math.random().toString(16).substr(2, 6).toUpperCase().match(/.{1,2}/g).join(':');

        return { device, os, browser, mac: pseudoMac };
    }

    // Registration Form Submit
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        sendOtpBtn.classList.add('loading');
        sendOtpBtn.disabled = true;

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const countryCode = document.getElementById('country-code').value;
        const rawMobile = document.getElementById('mobile').value;
        const mobile = countryCode + "-" + rawMobile;
        const company = document.getElementById('company').value;
        const purpose = document.getElementById('purpose').value;

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, mobile, company, purpose })
            });

            if (res.ok) {
                userMobile = mobile;
                // Transition to OTP view
                regView.classList.add('hidden');
                otpView.classList.remove('hidden');
            } else {
                alert('Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Network error. Please try again.');
        } finally {
            sendOtpBtn.classList.remove('loading');
            sendOtpBtn.disabled = false;
        }
    });

    // OTP Input logic (auto-advance)
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    // OTP Form Submit
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        verifyBtn.classList.add('loading');
        verifyBtn.disabled = true;

        const otp = Array.from(otpInputs).map(i => i.value).join('');
        const deviceInfo = getDeviceInfo();

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: userMobile, 
                    otp: otp,
                    mac: deviceInfo.mac,
                    device: deviceInfo.device,
                    os: deviceInfo.os,
                    browser: deviceInfo.browser
                })
            });

            if (res.ok) {
                const data = await res.json();
                
                // Display success data
                document.getElementById('display-ip').textContent = data.ip_address || '192.168.x.x';
                
                const timeStr = new Date(data.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                document.getElementById('display-time').textContent = timeStr;

                // Transition to Success view
                otpView.classList.add('hidden');
                successView.classList.remove('hidden');
                startCountdown(2 * 60 * 60); // 2 hours in seconds
            } else {
                alert('Invalid OTP. Please try again.');
                otpInputs.forEach(i => i.value = '');
                otpInputs[0].focus();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Network error. Please try again.');
        } finally {
            verifyBtn.classList.remove('loading');
            verifyBtn.disabled = false;
        }
    });

    function startCountdown(durationInSeconds) {
        let timer = durationInSeconds;
        const display = document.getElementById('countdown-timer');
        
        const interval = setInterval(() => {
            const hours = parseInt(timer / 3600, 10);
            const minutes = parseInt((timer % 3600) / 60, 10);
            const seconds = parseInt(timer % 60, 10);

            const h = hours < 10 ? "0" + hours : hours;
            const m = minutes < 10 ? "0" + minutes : minutes;
            const s = seconds < 10 ? "0" + seconds : seconds;

            display.textContent = h + ":" + m + ":" + s;

            if (--timer < 0) {
                clearInterval(interval);
                display.textContent = "Session Expired";
                display.style.color = "var(--danger)";
            }
        }, 1000);
    }
});
