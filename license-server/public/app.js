const API_URL = "http://localhost:3000/api";

// State
let currentUser = null;
let token = localStorage.getItem("token");

// DOM Elements
const views = {
  auth: document.getElementById("auth-view"),
  dashboard: document.getElementById("dashboard-layout"),
  overview: document.getElementById("view-overview"),
  licenses: document.getElementById("view-licenses"),
  users: document.getElementById("view-users"),
  settings: document.getElementById("view-settings"),
};

const forms = {
  login: document.getElementById("login-form"),
  register: document.getElementById("register-form"),
  profile: document.getElementById("profile-form"),
};

// Init
document.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    try {
      await fetchCurrentUser();
      showDashboard();
    } catch (error) {
      console.error("Session invalid:", error);
      logout();
    }
  } else {
    showAuth();
  }

  setupEventListeners();
});

// Auth Functions
async function fetchCurrentUser() {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Unauthorized");

  const data = await response.json();
  currentUser = data.data;
  updateUserInfo();
}

function updateUserInfo() {
  document.getElementById("user-name").textContent =
    currentUser.full_name || "User";
  document.getElementById("user-email").textContent = currentUser.email;
  document.getElementById("user-initials").textContent = (
    currentUser.full_name || currentUser.email
  )
    .substring(0, 2)
    .toUpperCase();

  // Show/Hide Admin Links
  if (currentUser.role === "admin") {
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => (el.style.display = "flex"));
  } else {
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => (el.style.display = "none"));
  }

  // Populate profile form
  if (currentUser) {
    document.getElementById("profile-name").value = currentUser.full_name || "";
    document.getElementById("profile-email").value = currentUser.email || "";
    document.getElementById("profile-phone").value = currentUser.phone || "";
  }
}

async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      token = data.data.token;
      currentUser = data.data.user;
      localStorage.setItem("token", token);
      showDashboard();
      updateUserInfo();
    } else {
      alert(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred during login");
  }
}

async function register() {
  const fullName = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const phoneInput = document.getElementById("register-phone");
  const password = document.getElementById("register-password").value;

  // Get the full international phone number
  let phone = phoneInput.value;
  if (phoneInput.itiInstance) {
    phone = phoneInput.itiInstance.getNumber();
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        phone: phone || null,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Auto-login after successful registration
      await login(email, password);
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("An error occurred during registration");
  }
}

async function updateProfile(e) {
  // Handle event if passed
  if (e && e.preventDefault) {
    e.preventDefault();
  }

  const fullNameInput = document.getElementById("profile-fullname");
  const phoneInput = document.getElementById("profile-phone");
  const passwordInput = document.getElementById("profile-password");

  // Check if elements exist
  if (!fullNameInput || !phoneInput || !passwordInput) {
    console.error("Profile form elements not found");
    alert("Error: Profile form elements not found");
    return;
  }

  const fullName = fullNameInput.value;
  const password = passwordInput.value;

  // Get the full international phone number from intl-tel-input
  let phone = phoneInput.value;
  if (phoneInput.itiInstance) {
    phone = phoneInput.itiInstance.getNumber(); // Gets full number with country code
  }

  try {
    const payload = { full_name: fullName };
    if (phone) payload.phone = phone;
    if (password) payload.password = password;

    const response = await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      alert("Profile updated successfully!");
      currentUser = data.data;
      updateUserInfo();
      // Clear password field
      passwordInput.value = "";
    } else {
      alert(data.message || "Failed to update profile");
    }
  } catch (error) {
    console.error("Update profile error:", error);
    alert("An error occurred while updating profile");
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("token");
  showAuth();
}

// Payment Gateway Functions
async function savePaymentSettings(gateway, settings) {
  try {
    const response = await fetch(`${API_URL}/settings/payment-gateway`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gateway, settings }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Payment gateway settings saved successfully!");
    } else {
      alert(data.message || "Failed to save settings");
    }
  } catch (error) {
    console.error("Payment settings error:", error);
    alert("An error occurred while saving payment settings");
  }
}

async function loadPaymentSettings() {
  try {
    const response = await fetch(`${API_URL}/settings/payment-gateway`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success && data.data) {
      const { gateway, settings } = data.data;
      const gatewaySelect = document.getElementById("payment-gateway");
      if (gatewaySelect) {
        gatewaySelect.value = gateway || "";
        toggleGatewaySettings(gateway);
        
        // Populate settings based on gateway
        if (gateway === "stripe") {
          document.getElementById("stripe-publishable-key").value = settings.publishableKey || "";
          document.getElementById("stripe-secret-key").value = settings.secretKey || "";
        } else if (gateway === "paystack") {
          document.getElementById("paystack-public-key").value = settings.publicKey || "";
          document.getElementById("paystack-secret-key").value = settings.secretKey || "";
        } else if (gateway === "paypal") {
          document.getElementById("paypal-client-id").value = settings.clientId || "";
          document.getElementById("paypal-secret").value = settings.secret || "";
          document.getElementById("paypal-mode").value = settings.mode || "sandbox";
        }
      }
    }
  } catch (error) {
    console.error("Load payment settings error:", error);
  }
}

function toggleGatewaySettings(gateway) {
  // Hide all gateway settings
  document.querySelectorAll(".gateway-settings").forEach((el) => {
    el.style.display = "none";
  });

  // Show selected gateway settings
  if (gateway) {
    const settingsDiv = document.getElementById(`${gateway}-settings`);
    if (settingsDiv) {
      settingsDiv.style.display = "block";
    }
  }
}

// Pricing Tiers Functions
let pricingTiers = [];

async function loadPricingTiers() {
  try {
    const response = await fetch(`${API_URL}/settings/pricing-tiers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success) {
      pricingTiers = data.data || [];
      displayPricingTiers();
    }
  } catch (error) {
    console.error("Load pricing tiers error:", error);
  }
}

function displayPricingTiers() {
  const tiersList = document.getElementById("tiers-list");
  
  if (!tiersList) return;
  
  if (pricingTiers.length === 0) {
    tiersList.innerHTML = '<p style="color: #6b7280">No pricing tiers configured. Click "Add New Tier" to create one.</p>';
    return;
  }

  tiersList.innerHTML = pricingTiers.map(tier => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem">
      <div style="display: flex; justify-content: space-between; align-items: start">
        <div>
          <h4 style="margin: 0 0 0.5rem 0">${tier.name}</h4>
          <p style="margin: 0 0 0.5rem 0; color: #059669; font-size: 1.25rem; font-weight: 600">$${tier.price}/month</p>
          ${tier.description ? `<p style="margin: 0 0 0.5rem 0; color: #6b7280">${tier.description}</p>` : ''}
          ${tier.features ? `
            <ul style="margin: 0.5rem 0 0 1.25rem; color: #374151">
              ${tier.features.split('\n').filter(f => f.trim()).map(f => `<li>${f}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem">
          <button class="btn-secondary" onclick="editTier(${tier.id})" style="padding: 0.5rem 1rem">Edit</button>
          <button class="btn-secondary" onclick="deleteTier(${tier.id})" style="padding: 0.5rem 1rem; background: #ef4444; color: white">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function loadTiersForDropdown() {
  try {
    const response = await fetch(`${API_URL}/settings/pricing-tiers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success) {
      pricingTiers = data.data || [];
      const tierSelect = document.getElementById("license-tier");
      
      if (tierSelect) {
        if (pricingTiers.length === 0) {
          tierSelect.innerHTML = '<option value="">No tiers available</option>';
        } else {
          tierSelect.innerHTML = pricingTiers.map(tier => 
            `<option value="${tier.name}" data-price="${tier.price}">${tier.name} - $${tier.price}/month</option>`
          ).join('');
          
          // Trigger price calculation
          updateLicensePrice();
        }
      }
    }
  } catch (error) {
    console.error("Load tiers for dropdown error:", error);
  }
}

function updateLicensePrice() {
  const tierSelect = document.getElementById("license-tier");
  const durationInput = document.getElementById("license-duration");
  const priceDisplay = document.getElementById("license-price-display");
  const calculatedPrice = document.getElementById("calculated-price");
  
  if (!tierSelect || !durationInput || !priceDisplay || !calculatedPrice) return;
  
  const selectedOption = tierSelect.options[tierSelect.selectedIndex];
  const price = parseFloat(selectedOption.dataset.price || 0);
  const duration = parseInt(durationInput.value || 0);
  
  if (price > 0 && duration > 0) {
    const total = (price * duration).toFixed(2);
    calculatedPrice.textContent = `$${total}`;
    priceDisplay.style.display = "block";
  } else {
    priceDisplay.style.display = "none";
  }
}

function showCreateTierModal() {
  document.getElementById("tier-modal-title").textContent = "Create Pricing Tier";
  document.getElementById("tier-form").reset();
  document.getElementById("tier-id").value = "";
  document.getElementById("tier-modal").style.display = "flex";
}

function editTier(tierId) {
  const tier = pricingTiers.find(t => t.id === tierId);
  if (!tier) return;
  
  document.getElementById("tier-modal-title").textContent = "Edit Pricing Tier";
  document.getElementById("tier-id").value = tier.id;
  document.getElementById("tier-name").value = tier.name;
  document.getElementById("tier-price").value = tier.price;
  document.getElementById("tier-description").value = tier.description || "";
  document.getElementById("tier-features").value = tier.features || "";
  document.getElementById("tier-modal").style.display = "flex";
}

function closeTierModal() {
  document.getElementById("tier-modal").style.display = "none";
  document.getElementById("tier-form").reset();
}

async function saveTier(tierId, tierData) {
  try {
    const url = tierId 
      ? `${API_URL}/settings/pricing-tiers/${tierId}`
      : `${API_URL}/settings/pricing-tiers`;
    
    const response = await fetch(url, {
      method: tierId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tierData),
    });

    const data = await response.json();

    if (data.success) {
      alert(tierId ? "Tier updated successfully!" : "Tier created successfully!");
      closeTierModal();
      await loadPricingTiers();
    } else {
      alert(data.message || "Failed to save tier");
    }
  } catch (error) {
    console.error("Save tier error:", error);
    alert("An error occurred while saving tier");
  }
}

async function deleteTier(tierId) {
  if (!confirm("Are you sure you want to delete this pricing tier?")) return;
  
  try {
    const response = await fetch(`${API_URL}/settings/pricing-tiers/${tierId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success) {
      alert("Tier deleted successfully!");
      await loadPricingTiers();
    } else {
      alert(data.message || "Failed to delete tier");
    }
  } catch (error) {
    console.error("Delete tier error:", error);
    alert("An error occurred while deleting tier");
  }
}

// Navigation
function showAuth() {
  if (views.dashboard) views.dashboard.style.display = "none";
  if (views.auth) views.auth.style.display = "flex";
}

function showDashboard() {
  if (views.auth) views.auth.style.display = "none";
  if (views.dashboard) views.dashboard.style.display = "flex";
  navigateTo("overview");
}

function showLogin() {
  document.getElementById("register-card").style.display = "none";
  document.getElementById("login-card").style.display = "block";
}

function showRegister() {
  document.getElementById("login-card").style.display = "none";
  document.getElementById("register-card").style.display = "block";
}

function navigateTo(viewName) {
  // Hide all views
  document
    .querySelectorAll(".view-section")
    .forEach((el) => (el.style.display = "none"));
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));

  // Show target view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.style.display = "block";

  // Update nav
  const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (navItem) navItem.classList.add("active");

  // Load data
  if (viewName === "overview") loadOverview();
  if (viewName === "licenses") loadLicenses();
  if (viewName === "users") loadUsers();
  if (viewName === "finance") loadFinance();
  if (viewName === "settings" && currentUser && currentUser.role === "admin") {
    loadPaymentSettings();
    loadPricingTiers();
  }
}

// Data Loading
async function loadOverview() {
  if (currentUser && currentUser.role === "admin") {
    // Admin view - show statistics
    await loadAdminStats();
  } else {
    // User view - show personal license
    await loadUserLicense();
  }
}

async function loadAdminStats() {
  try {
    // Show admin stats, hide user stats
    document.getElementById("admin-stats").style.display = "block";
    document.getElementById("user-stats").style.display = "none";

    // Fetch licenses for statistics
    const licensesResponse = await fetch(`${API_URL}/license/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const licensesData = await licensesResponse.json();
    const licenses = licensesData.data || [];

    // Fetch users for statistics
    const usersResponse = await fetch(`${API_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usersData = await usersResponse.json();
    const users = usersData.data || [];

    // Calculate statistics
    const totalLicenses = licenses.length;
    const activeLicenses = licenses.filter((l) => l.status === "active").length;
    const expiredLicenses = licenses.filter(
      (l) => l.status === "expired"
    ).length;
    const totalUsers = users.length;

    // Update stat cards
    document.getElementById("stat-total-licenses").textContent = totalLicenses;
    document.getElementById("stat-active-licenses").textContent =
      activeLicenses;
    document.getElementById("stat-total-users").textContent = totalUsers;
    document.getElementById("stat-expired-licenses").textContent =
      expiredLicenses;

    // Calculate tier breakdown
    const tierCounts = {};
    licenses.forEach((license) => {
      const tier = license.tier || "unknown";
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    // Display tier breakdown
    const tierBreakdownHtml = Object.entries(tierCounts)
      .map(
        ([tier, count]) => `
        <div class="detail-item">
          <span class="detail-label">${tier.toUpperCase()}</span>
          <span class="detail-value">${count} licenses</span>
        </div>
      `
      )
      .join("");

    const tierBreakdownEl = document.getElementById("tier-breakdown");
    if (tierBreakdownEl) {
      tierBreakdownEl.innerHTML =
        tierBreakdownHtml || '<p class="empty-state">No licenses yet</p>';
    }

    // Display recent license activity (last 10)
    const recentLicenses = licenses
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    const recentLicensesBody = document.getElementById("recent-licenses-body");
    if (recentLicensesBody) {
      if (recentLicenses.length === 0) {
        recentLicensesBody.innerHTML =
          '<tr><td colspan="4" class="text-center">No licenses yet</td></tr>';
      } else {
        recentLicensesBody.innerHTML = recentLicenses
          .map((license) => {
            // Assuming getTierPrice is defined elsewhere or will be added
            const price =
              typeof getTierPrice === "function"
                ? getTierPrice(license.tier)
                : "N/A";
            const date = new Date(license.created_at);
            return `
            <tr>
              <td>${license.user_email || "N/A"}</td>
              <td>${date.toLocaleString()}</td>
              <td><span class="tier-badge">${license.tier}</span></td>
              <td>$${price}</td>
            </tr>
          `;
          })
          .join("");
      }
    }
  } catch (error) {
    console.error("Error loading admin stats:", error);
  }
}

async function loadFinance() {
  // Function to be implemented later
}

async function loadUserLicense() {
  try {
    // Show user stats, hide admin stats
    document.getElementById("admin-stats").style.display = "none";
    document.getElementById("user-stats").style.display = "block";

    const response = await fetch(`${API_URL}/license/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    const licenses = data.data || [];

    const activeLicense = licenses.find((l) => l.status === "active");

    if (activeLicense) {
      document.getElementById("current-plan").textContent =
        activeLicense.tier.toUpperCase();
      document.getElementById("license-status").textContent = "Active";
      document.getElementById("user-license-details").innerHTML = `
                <div class="license-info">
                    <p><strong>Key:</strong> <code>${
                      activeLicense.license_key
                    }</code></p>
                    <p><strong>Expires:</strong> ${new Date(
                      activeLicense.expires_at
                    ).toLocaleDateString()}</p>
                </div>
            `;
    } else {
      document.getElementById("current-plan").textContent = "Free";
      document.getElementById("license-status").textContent = "Inactive";
      document.getElementById("user-license-details").innerHTML =
        '<p class="empty-state">No active license found.</p>';
    }
  } catch (error) {
    console.error("Error loading user license:", error);
  }
}

async function loadLicenses() {
  try {
    const response = await fetch(`${API_URL}/license/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    renderLicensesTable(data.data || []);
  } catch (error) {
    console.error("Error loading licenses:", error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    renderUsersTable(data.data || []);
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

async function loadFinance() {
  try {
    // Fetch all licenses as transactions
    const response = await fetch(`${API_URL}/license/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    const licenses = data.data || [];

    // Calculate revenue
    const totalRevenue = licenses.reduce(
      (sum, license) => sum + getTierPrice(license.tier),
      0
    );

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthRevenue = licenses
      .filter((license) => {
        const created = new Date(license.created_at);
        return (
          created.getMonth() === thisMonth && created.getFullYear() === thisYear
        );
      })
      .reduce((sum, license) => sum + getTierPrice(license.tier), 0);

    // Update stats
    document.getElementById(
      "stat-total-revenue"
    ).textContent = `$${totalRevenue.toLocaleString()}`;
    document.getElementById(
      "stat-month-revenue"
    ).textContent = `$${monthRevenue.toLocaleString()}`;
    document.getElementById("stat-total-transactions").textContent =
      licenses.length;

    // Render transactions table
    renderTransactionsTable(licenses);
  } catch (error) {
    console.error("Error loading finance:", error);
  }
}

// Helper function to get tier pricing
function getTierPrice(tier) {
  const prices = {
    starter: 29,
    pro: 79,
    enterprise: 199,
  };
  return prices[tier?.toLowerCase()] || 0;
}

function renderTransactionsTable(licenses) {
  const tbody = document.getElementById("transactions-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (licenses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
    return;
  }

  // Sort by date (newest first)
  const sortedLicenses = [...licenses].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  sortedLicenses.forEach((license) => {
    const price = getTierPrice(license.tier);
    const date = new Date(license.created_at);
    const duration = calculateDuration(license.created_at, license.expires_at);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${license.license_key.substring(0, 12)}...</code></td>
      <td>${license.user_email || "N/A"}</td>
      <td>${date.toLocaleString()}</td>
      <td><span class="tier-badge">${license.tier}</span></td>
      <td>${duration} months</td>
      <td>$${price}</td>
      <td><span class="status-badge status-${license.status}">${
      license.status
    }</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function calculateDuration(createdAt, expiresAt) {
  const start = new Date(createdAt);
  const end = new Date(expiresAt);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return months || 12; // Default to 12 if can't calculate
}

function renderUsersTable(users) {
  const tbody = document.getElementById("users-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">No users found</td></tr>';
    return;
  }

  users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${user.full_name || "-"}</td>
            <td>${user.email}</td>
            <td><span class="status-badge status-${
              user.role === "admin" ? "active" : "inactive"
            }">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <button class="action-btn" onclick="showEditUserModal(${
                  user.id
                }, '${user.full_name || ""}', '${user.email}', '${
      user.role
    }')">Edit</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

function renderLicensesTable(licenses) {
  const tbody = document.getElementById("licenses-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (licenses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No licenses found</td></tr>';
    return;
  }

  licenses.forEach((license) => {
    const isAdmin = currentUser && currentUser.role === "admin";
    const statusAction = license.status === "active" ? "suspend" : "activate";
    const statusLabel = license.status === "active" ? "Deactivate" : "Activate";

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><code>${license.license_key}</code></td>
            <td>${license.user_email || "-"}</td>
            <td><span class="tier-badge">${license.tier}</span></td>
            <td><span class="status-badge status-${license.status}">${
      license.status
    }</span></td>
            <td>${new Date(license.expires_at).toLocaleDateString()}</td>
            <td>${license.activation_count || 0} / ${
      license.max_activations
    }</td>
            <td>
                <button class="action-btn" title="Copy Key" onclick="navigator.clipboard.writeText('${
                  license.license_key
                }')">
                    Copy
                </button>
        ${
          currentUser.role === "admin"
            ? license.status === "active"
              ? `<button class="btn-secondary" onclick="toggleLicenseStatus('${license.license_key}', 'deactivate')">Deactivate</button>`
              : `<button class="btn-primary" onclick="toggleLicenseStatus('${license.license_key}', 'activate')">Activate</button>`
            : ""
        }
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// Modal Functions
async function showCreateModal() {
  // Pre-populate user's email
  if (currentUser && currentUser.email) {
    // Store email in a data attribute since the field is removed
    document.getElementById("create-license-form").dataset.userEmail = currentUser.email;
  }
  
  // Load tiers and populate dropdown
  await loadTiersForDropdown();
  
  document.getElementById("create-license-modal").style.display = "flex";
}

function closeCreateModal() {
  document.getElementById("create-license-modal").style.display = "none";
  document.getElementById("create-license-form").reset();
}

function showEditUserModal(userId, fullName, email, role) {
  document.getElementById("edit-user-id").value = userId;
  document.getElementById("edit-user-name").value = fullName;
  document.getElementById("edit-user-email").value = email;
  document.getElementById("edit-user-role").value = role;
  document.getElementById("edit-user-modal").style.display = "flex";
}

function closeEditUserModal() {
  document.getElementById("edit-user-modal").style.display = "none";
  document.getElementById("edit-user-form").reset();
}

async function createLicense(email, tier, duration) {
  try {
    const response = await fetch(`${API_URL}/license/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, tier, duration }),
    });

    const data = await response.json();

    if (data.success) {
      alert("License created successfully!");
      closeCreateModal();
      loadLicenses(); // Reload licenses table
    } else {
      alert(data.message || "Failed to create license");
    }
  } catch (error) {
    console.error("Create license error:", error);
    alert("An error occurred while creating license");
  }
}

async function editUser(userId, fullName, email, role) {
  try {
    const response = await fetch(`${API_URL}/auth/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ full_name: fullName, email, role }),
    });

    const data = await response.json();

    if (data.success) {
      alert("User updated successfully!");
      closeEditUserModal();
      loadUsers(); // Reload users table
    } else {
      alert(data.message || "Failed to update user");
    }
  } catch (error) {
    console.error("Edit user error:", error);
    alert("An error occurred while updating user");
  }
}

async function toggleLicenseStatus(licenseKey, action) {
  const actionText = action === "activate" ? "activate" : "deactivate";

  console.log("toggleLicenseStatus called:", {
    licenseKey,
    action,
    actionText,
  });

  // Show confirmation modal
  showConfirmStatusModal(
    action === "activate" ? "Activate License" : "Deactivate License",
    `Are you sure you want to ${actionText} this license?`,
    async () => {
      try {
        // Map action to correct status
        const newStatus = action === "activate" ? "active" : "suspended";
        console.log("Sending API request:", {
          license_key: licenseKey,
          status: newStatus,
        });

        const response = await fetch(`${API_URL}/license/update-status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ license_key: licenseKey, status: newStatus }),
        });

        console.log("API response status:", response.status);
        const data = await response.json();
        console.log("API response data:", data);

        if (data.success) {
          alert(`License ${actionText}d successfully!`);
          loadLicenses(); // Reload licenses table
        } else {
          alert(data.message || `Failed to ${actionText} license`);
        }
      } catch (error) {
        console.error(`Toggle license status error:`, error);
        alert(`An error occurred while ${actionText}ing license`);
      }
    }
  );
}

function showConfirmStatusModal(title, message, onConfirm) {
  console.log("showConfirmStatusModal called with:", {
    title,
    message,
    hasCallback: !!onConfirm,
  });

  document.getElementById("confirm-status-title").textContent = title;
  document.getElementById("confirm-status-message").textContent = message;
  document.getElementById("confirm-status-modal").style.display = "flex";

  // Store the callback
  window._confirmStatusCallback = onConfirm;
  console.log("Callback stored:", !!window._confirmStatusCallback);

  // Set up the confirm button - remove previous listeners
  const confirmBtn = document.getElementById("confirm-status-btn");
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.onclick = async () => {
    console.log("Confirm button clicked!");

    // Store callback locally before closing modal (which clears it)
    const callback = window._confirmStatusCallback;
    console.log("Callback before close:", !!callback);

    closeConfirmStatusModal();

    if (callback) {
      console.log("Executing callback...");
      await callback();
    } else {
      console.log("No callback found!");
    }
  };
  console.log("Modal setup complete");
}

function closeConfirmStatusModal() {
  console.log("closeConfirmStatusModal called");
  document.getElementById("confirm-status-modal").style.display = "none";
  window._confirmStatusCallback = null;
}

// Create User Modal Functions
function showCreateUserModal() {
  document.getElementById("create-user-modal").style.display = "flex";
  // Re-initialize phone input for the new modal
  setTimeout(() => initPhoneInputs(), 100);
}

function closeCreateUserModal() {
  document.getElementById("create-user-modal").style.display = "none";
  document.getElementById("create-user-form").reset();
}

async function createUser(e) {
  e.preventDefault();

  const fullName = document.getElementById("new-user-fullname").value;
  const email = document.getElementById("new-user-email").value;
  const password = document.getElementById("new-user-password").value;
  const phoneInput = document.getElementById("new-user-phone");
  const role = document.getElementById("new-user-role").value;

  // Get the full international phone number
  let phone = phoneInput.value;
  if (phoneInput.itiInstance) {
    phone = phoneInput.itiInstance.getNumber();
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        phone,
        role,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert("User created successfully!");
      closeCreateUserModal();
      loadUsers(); // Reload users table
    } else {
      alert(data.message || "Failed to create user");
    }
  } catch (error) {
    console.error("Create user error:", error);
    alert("An error occurred while creating user");
  }
}

// Event Listeners
function setupEventListeners() {
  // Auth Forms
  if (forms.login) {
    forms.login.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      login(email, password);
    });
  }

  if (forms.register) {
    forms.register.addEventListener("submit", (e) => {
      e.preventDefault();
      register();
    });
  }

  // Profile Form
  if (forms.profile) {
    forms.profile.addEventListener("submit", (e) => {
      e.preventDefault();
      const fullName = document.getElementById("profile-name").value;
      const phone = document.getElementById("profile-phone").value;
      const password = document.getElementById("profile-password").value;
      updateProfile(fullName, phone, password);
    });
  }

  // Create License Form
  const createLicenseForm = document.getElementById("create-license-form");
  if (createLicenseForm) {
    createLicenseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = createLicenseForm.dataset.userEmail || currentUser.email;
      const tier = document.getElementById("license-tier").value;
      const duration = document.getElementById("license-duration").value;
      createLicense(email, tier, duration);
    });
  }

  // Edit User Form
  const editUserForm = document.getElementById("edit-user-form");
  if (editUserForm) {
    editUserForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const userId = document.getElementById("edit-user-id").value;
      const fullName = document.getElementById("edit-user-name").value;
      const email = document.getElementById("edit-user-email").value;
      const role = document.getElementById("edit-user-role").value;
      editUser(userId, fullName, email, role);
    });
  }

  // Payment Settings Form
  const paymentSettingsForm = document.getElementById("payment-settings-form");
  if (paymentSettingsForm) {
    paymentSettingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const gateway = document.getElementById("payment-gateway").value;
      
      let settings = {};
      if (gateway === "stripe") {
        settings = {
          publishableKey: document.getElementById("stripe-publishable-key").value,
          secretKey: document.getElementById("stripe-secret-key").value,
        };
      } else if (gateway === "paystack") {
        settings = {
          publicKey: document.getElementById("paystack-public-key").value,
          secretKey: document.getElementById("paystack-secret-key").value,
        };
      } else if (gateway === "paypal") {
        settings = {
          clientId: document.getElementById("paypal-client-id").value,
          secret: document.getElementById("paypal-secret").value,
          mode: document.getElementById("paypal-mode").value,
        };
      }
      
      savePaymentSettings(gateway, settings);
    });
  }

  // Payment Gateway Selector Change
  const paymentGatewaySelect = document.getElementById("payment-gateway");
  if (paymentGatewaySelect) {
    paymentGatewaySelect.addEventListener("change", (e) => {
      toggleGatewaySettings(e.target.value);
    });
  }

  // Tier Form
  const tierForm = document.getElementById("tier-form");
  if (tierForm) {
    tierForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const tierId = document.getElementById("tier-id").value;
      const tierData = {
        name: document.getElementById("tier-name").value,
        price: parseFloat(document.getElementById("tier-price").value),
        description: document.getElementById("tier-description").value,
        features: document.getElementById("tier-features").value,
      };
      saveTier(tierId || null, tierData);
    });
  }

  // License Tier Change - Update Price
  const licenseTierSelect = document.getElementById("license-tier");
  const licenseDurationInput = document.getElementById("license-duration");
  
  if (licenseTierSelect) {
    licenseTierSelect.addEventListener("change", updateLicensePrice);
  }
  
  if (licenseDurationInput) {
    licenseDurationInput.addEventListener("input", updateLicensePrice);
  }

  // Navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      navigateTo(view);
    });
  });

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Auth Toggle
  const showRegisterBtn = document.getElementById("show-register");
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showRegister();
    });
  }

  const showLoginBtn = document.getElementById("show-login");
  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showLogin();
    });
  }

  // Close modal on outside click
  window.addEventListener("click", (e) => {
    const createModal = document.getElementById("create-license-modal");
    const editModal = document.getElementById("edit-user-modal");
    const confirmModal = document.getElementById("confirm-status-modal");
    const createUserModal = document.getElementById("create-user-modal");

    if (e.target === createModal) {
      closeCreateModal();
    }
    if (e.target === editModal) {
      closeEditUserModal();
    }
    if (e.target === confirmModal) {
      closeConfirmStatusModal();
    }
    if (e.target === createUserModal) {
      closeCreateUserModal();
    }
  });

  // Initialize international phone input
  initPhoneInputs();
}

// Initialize intl-tel-input for phone fields
function initPhoneInputs() {
  const phoneInputs = document.querySelectorAll('input[type="tel"]');

  phoneInputs.forEach((input) => {
    if (!input.dataset.itiInitialized) {
      window.intlTelInputGlobals.getInstance(input)?.destroy();
      const iti = window.intlTelInput(input, {
        initialCountry: "us",
        preferredCountries: ["us", "gb", "ca", "au"],
        utilsScript:
          "https://cdn.jsdelivr.net/npm/intl-tel-input@19.5.6/build/js/utils.js",
        separateDialCode: true,
        nationalMode: false,
        autoPlaceholder: "aggressive",
        formatOnDisplay: true,
      });
      input.dataset.itiInitialized = "true";
      input.itiInstance = iti;
    }
  });
}
