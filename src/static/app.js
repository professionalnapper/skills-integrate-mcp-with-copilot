document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userMenuButton = document.getElementById("user-menu-button");
  const userMenu = document.getElementById("user-menu");
  const openLoginButton = document.getElementById("open-login");
  const logoutButton = document.getElementById("logout");
  const loginModal = document.getElementById("login-modal");
  const closeLoginButton = document.getElementById("close-login");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const teacherStatus = document.getElementById("teacher-status");
  const teacherOnlyNote = document.getElementById("teacher-only-note");

  let authState = { is_teacher: false, username: null };

  function showBanner(target, text, className) {
    target.textContent = text;
    target.className = className;
    target.classList.remove("hidden");

    setTimeout(() => {
      target.classList.add("hidden");
    }, 5000);
  }

  async function refreshAuthState() {
    const response = await fetch("/auth/status");
    authState = await response.json();
    applyAuthState();
  }

  function applyAuthState() {
    if (authState.is_teacher) {
      teacherStatus.textContent = `Logged in as teacher: ${authState.username}`;
      openLoginButton.classList.add("hidden");
      logoutButton.classList.remove("hidden");
      teacherOnlyNote.classList.add("hidden");
      signupForm.querySelectorAll("input, select, button").forEach((element) => {
        element.disabled = false;
      });
    } else {
      teacherStatus.textContent = "Viewing as student";
      openLoginButton.classList.remove("hidden");
      logoutButton.classList.add("hidden");
      teacherOnlyNote.classList.remove("hidden");
      signupForm.querySelectorAll("input, select, button").forEach((element) => {
        element.disabled = true;
      });
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        authState.is_teacher
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      if (authState.is_teacher) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!authState.is_teacher) {
      showBanner(messageDiv, "Only teachers can unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showBanner(messageDiv, result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showBanner(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showBanner(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authState.is_teacher) {
      showBanner(messageDiv, "Only teachers can register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showBanner(messageDiv, result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showBanner(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showBanner(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuButton.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!userMenu.contains(event.target) && event.target !== userMenuButton) {
      userMenu.classList.add("hidden");
    }
  });

  openLoginButton.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userMenu.classList.add("hidden");
  });

  closeLoginButton.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        showBanner(loginMessage, result.message, "success");
        await refreshAuthState();
        await fetchActivities();
        loginModal.classList.add("hidden");
        loginForm.reset();
      } else {
        showBanner(loginMessage, result.detail || "Login failed", "error");
      }
    } catch (error) {
      showBanner(loginMessage, "Login request failed.", "error");
      console.error("Login error:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const result = await response.json();

      if (response.ok) {
        showBanner(messageDiv, result.message, "success");
      }
    } catch (error) {
      showBanner(messageDiv, "Failed to logout.", "error");
      console.error("Logout error:", error);
    } finally {
      userMenu.classList.add("hidden");
      await refreshAuthState();
      await fetchActivities();
    }
  });

  // Initialize app
  refreshAuthState().then(fetchActivities);
});
