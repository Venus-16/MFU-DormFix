document.addEventListener("DOMContentLoaded", () => {
    fetch('/student/info')
        .then(res => res.json())
        .then(data => {
            document.getElementById("studentName").innerText = data.name;
        })
        .catch(err => {
            console.error('Failed to load name:', err);
            document.getElementById("studentName").innerText = "Student";
        });

    const userBtn = document.getElementById("userBtn");
    const dropdown = document.getElementById("userDropdown");

    userBtn?.addEventListener("click", () => {
        dropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", function (e) {
        const isInside = userBtn.contains(e.target) || dropdown.contains(e.target);
        if (!isInside) {
            dropdown.classList.add("hidden");
        }
    });
});
