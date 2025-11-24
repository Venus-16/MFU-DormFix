document.addEventListener('DOMContentLoaded', () => {
    const setPasswordBtn = document.querySelector('.set-password-button');

    setPasswordBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById('new-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();
        const email = document.getElementById('email').value.trim();


        if (!email || !newPassword || !confirmPassword) {
            return Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please fill in all fields.',
                confirmButtonColor: '#bfa048'
            });
        }



        if (!newPassword || !confirmPassword) {
            return Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please fill in all fields.',
                confirmButtonColor: '#bfa048'
            });
        }

        if (newPassword !== confirmPassword) {
            return Swal.fire({
                icon: 'error',
                title: 'Password Mismatch',
                text: 'Passwords do not match. Please try again.',
                confirmButtonColor: '#bfa048'
            });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return Swal.fire({
                icon: 'error',
                title: 'Weak Password',
                text: 'Password must be at least 8 characters long, include at least 1 uppercase letter and 1 number.',
                confirmButtonColor: '#bfa048'
            });
        }



        try {
            const response = await fetch('/set_password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, newPassword })

            });

            const result = await response.json();

            if (result.status === 'success') {
                await Swal.fire({
                    icon: 'success',
                    title: 'Password Set Successfully!',
                    text: 'You can now log in with your new password.',
                    confirmButtonColor: '#bfa048'
                });
                window.location.href = '/login';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Set Password',
                    text: result.message,
                    confirmButtonColor: '#bfa048'
                });
            }

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Please check your internet connection.',
                confirmButtonColor: '#bfa048'
            });
        }
    });




    // Toggle password visibility
    const toggleIcons = document.querySelectorAll('.toggle-password');
    toggleIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const targetId = icon.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    });
});
