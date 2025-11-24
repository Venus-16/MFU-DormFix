document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.querySelector('.login-button');
    const errorDiv = document.getElementById('error-message');

    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        errorDiv.textContent = ''; // clear error

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            errorDiv.textContent = "Please enter both email and password.";
            return;
        }

        try {
            const response = await fetch('/loggingin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.redirected) {

                if (response.url.includes('/set_password')) {
                    await Swal.fire({
                        title: 'Welcome!',
                        text: 'This is your first time logging in. Please set your password.',
                        icon: 'info',
                        confirmButtonColor: '#d32f2f'
                    });
                }

                window.location.href = response.url;
            } else {
                const errorText = await response.text();


                if (errorText === 'User not found') {
                    Swal.fire({
                        title: 'Access Denied',
                        text: 'You do not have permission to use this system.',
                        icon: 'error',
                        confirmButtonColor: '#d32f2f'
                    });
                } else {
                    Swal.fire({
                        title: 'Login Failed',
                        text: errorText,
                        icon: 'warning',
                        confirmButtonColor: '#d32f2f'
                    });
                }
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                title: 'Network Error',
                text: 'Please check your internet connection.',
                icon: 'error',
                confirmButtonColor: '#d32f2f'
            });
        }
    });

    // toggle password
    const toggle = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    toggle.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggle.classList.toggle('fa-eye');
        toggle.classList.toggle('fa-eye-slash');
    });
});



