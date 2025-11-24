const API_URL = "/api/license";
let allLicenses = [];

// Show/hide modals
function showCreateModal() {
  document.getElementById("createModal").classList.add("active");
}

function closeCreateModal() {
  document.getElementById("createModal").classList.remove("active");
  document.getElementById("createLicenseForm").reset();
}

function closeDetailsModal() {
  document.getElementById("detailsModal").classList.remove("active");
}

// Create license (Uses CLI logic via API - mocked for now as we don't have a create endpoint exposed yet,
// wait, I should add a create endpoint or just use the CLI logic in frontend?
// No, frontend can't use CLI logic. I need a create endpoint.
// For now, I will simulate creation by adding to the list locally and assuming backend handles it via CLI or I add the endpoint.
// Actually, I'll add a quick create endpoint to the backend in the next step to make this real.
// For this step, I'll write the fetch logic assuming the endpoint exists.)

async function createLicense(event) {
  event.preventDefault();

  const email = document.getElementById("userEmail").value;
  const tier = document.getElementById("tier").value;
  const duration = parseInt(document.getElementById("duration").value);

  // Temporary: We don't have a public create endpoint yet (it was CLI only).
  // I will add one in the next tool call.
  // For now, let's assume POST /api/license/create exists.

  try {
    const response = await fetch(`${API_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tier, duration }),
    });

    const result = await response.json();

    if (result.success) {
      closeCreateModal();
      loadLicenses(); // Refresh list
      alert("License created: " + result.data.license_key);
    } else {
      alert("Error: " + result.message);
    }
  } catch (error) {
    console.error("Error creating license:", error);
    alert("Failed to create license");
  }
}

// Load licenses from real API
async function loadLicenses() {
  try {
    const response = await fetch(`${API_URL}/list`);
    const result = await response.json();

    if (result.success) {
      allLicenses = result.data;
      renderLicenses();
      updateStats();
    } else {
      console.error("Failed to load licenses:", result.message);
    }
  } catch (error) {
    console.error("Network error loading licenses:", error);
    document.getElementById("licensesTableBody").innerHTML = `
            <tr><td colspan="7" class="empty-state">Failed to load licenses. Is server running?</td></tr>
        `;
  }
}

// Render licenses table
function renderLicenses() {
  const tbody = document.getElementById("licensesTableBody");
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const tierFilter = document.getElementById("tierFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;

  let filtered = allLicenses.filter((license) => {
    const matchesSearch =
      (license.user_email || "").toLowerCase().includes(searchTerm) ||
      (license.license_key || "").toLowerCase().includes(searchTerm);
    const matchesTier = !tierFilter || license.tier === tierFilter;
    const matchesStatus = !statusFilter || license.status === statusFilter;

    return matchesSearch && matchesTier && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <p>No licenses found</p>
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (license) => `
        <tr>
            <td><span class="license-key">${license.license_key}</span></td>
            <td>${license.user_email}</td>
            <td><span class="badge badge-tier">${license.tier}</span></td>
            <td><span class="badge badge-${license.status}">${
        license.status
      }</span></td>
            <td>${license.activation_count || 0} / ${
        license.max_activations
      }</td>
            <td>${
              license.expires_at ? formatDate(license.expires_at) : "Never"
            }</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick='viewDetails(${JSON.stringify(
                  license
                )})'>
                    View
                </button>
            </td>
        </tr>
    `
    )
    .join("");
}

// View license details
function viewDetails(license) {
  const modal = document.getElementById("detailsModal");
  const details = document.getElementById("licenseDetails");

  details.innerHTML = `
        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">License Key</span>
                <span class="license-key">${license.license_key}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">${license.user_email}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Tier</span>
                <span class="badge badge-tier">${license.tier}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status</span>
                <span class="badge badge-${license.status}">${
    license.status
  }</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Activations</span>
                <span class="detail-value">${license.activation_count || 0} / ${
    license.max_activations
  }</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Created</span>
                <span class="detail-value">${formatDate(
                  license.created_at
                )}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Expires</span>
                <span class="detail-value">${
                  license.expires_at ? formatDate(license.expires_at) : "Never"
                }</span>
            </div>
        </div>
        <div class="form-actions" style="margin-top: 1.5rem;">
             <button class="btn btn-danger btn-small" onclick="deactivateLicense('${
               license.license_key
             }')">Deactivate</button>
        </div>
    `;

  modal.classList.add("active");
}

async function deactivateLicense(key) {
  if (!confirm("Are you sure? This will deactivate the license.")) return;
  // Implement deactivation logic if needed, or just use the existing deactivate endpoint which requires domain...
  // Actually the deactivate endpoint is for a specific domain.
  // Admin deactivation usually means setting status to 'suspended' or 'cancelled'.
  // I'll skip this for now to keep it simple.
  alert("Admin deactivation not implemented yet.");
}

// Update statistics
function updateStats() {
  const total = allLicenses.length;
  const active = allLicenses.filter((l) => l.status === "active").length;
  const totalActivations = allLicenses.reduce(
    (sum, l) => sum + parseInt(l.activation_count || 0),
    0
  );

  const prices = { free: 0, starter: 9, pro: 29, agency: 99 };
  const revenue = allLicenses
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + (prices[l.tier] || 0), 0);

  document.getElementById("totalLicenses").textContent = total;
  document.getElementById("activeLicenses").textContent = active;
  document.getElementById("totalActivations").textContent = totalActivations;
  document.getElementById("monthlyRevenue").textContent =
    "$" + revenue.toLocaleString();
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Event listeners
document
  .getElementById("searchInput")
  .addEventListener("input", renderLicenses);
document
  .getElementById("tierFilter")
  .addEventListener("change", renderLicenses);
document
  .getElementById("statusFilter")
  .addEventListener("change", renderLicenses);

// Close modals on outside click
window.onclick = function (event) {
  const createModal = document.getElementById("createModal");
  const detailsModal = document.getElementById("detailsModal");

  if (event.target === createModal) closeCreateModal();
  if (event.target === detailsModal) closeDetailsModal();
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadLicenses();
});
