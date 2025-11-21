# Deploying ImgPressor to Laravel Forge

While Laravel Forge is designed for PHP/Laravel, it is excellent for managing Node.js applications too. This guide will show you how to deploy `imgpressor` on a Forge-provisioned server.

## Prerequisites

1.  A server provisioned by [Laravel Forge](https://forge.laravel.com/).
2.  Your code pushed to a Git repository (GitHub/GitLab/Bitbucket).

## Steps

### 1. Create a New Site

1.  Go to your Server in Forge.
2.  Under **New Site**:
    - **Root Domain**: `imgpressor.yourdomain.com` (or whatever domain you want).
    - **Project Type**: `Static HTML` (This is a placeholder; we will configure Nginx later).
    - **Web Directory**: `/` (Leave default).
3.  Click **Add Site**.

### 2. Install Repository

1.  Click on the newly created site.
2.  Select **Git Repository**.
3.  Enter your repository details (e.g., `josephjerryrhule/imgpressor`) and branch (`main`).
4.  Uncheck "Install Composer Dependencies" (this is a Node app).
5.  Click **Install Repository**.

### 3. Configure Deployment Script

Edit the **Deployment Script** to install Node dependencies and build assets.

> [!WARNING] > **Do NOT run `node app.js` here!** The deployment script must finish executing. The server process will be handled by the Daemon (Supervisor).

```bash
cd /home/forge/imgpressor.yourdomain.com
git pull origin $FORGE_SITE_BRANCH

# Install dependencies
npm install

# Build Tailwind CSS
npm run build

# Restart the Daemon to pick up changes
# (Forge usually handles this if you configured the Daemon correctly,
# but you can force it with this command if needed)
echo "" | sudo -S supervisorctl restart all
```

### 4. Set Up Daemon (Supervisor)

This keeps your Node.js app running in the background.

1.  Go to the **Server** dashboard (not the Site dashboard).
2.  Click **Daemons** in the left menu.
3.  **Command**: `node app.js`
4.  **User**: `forge`
5.  **Directory**: `/home/forge/imgpressor.yourdomain.com`
6.  **Processes**: `1`
7.  Click **Start Daemon**.

_Note: Make sure your app runs on a specific port. By default, `imgpressor` runs on port `3001`._

### 5. Configure Nginx (Reverse Proxy)

Now we need to tell Nginx to forward traffic from port 80/443 to your Node app on port 3001.

1.  Go back to your **Site** dashboard.
2.  Click **Edit Nginx Configuration** (bottom right).
3.  Find the `location / { ... }` block and replace it with:

```nginx
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Increase max body size for image uploads
        client_max_body_size 100M;
    }
```

4.  Also, verify that `client_max_body_size` is set globally or in the server block to allow large image uploads (e.g., `100M`).
5.  Save the configuration.

### 6. SSL (HTTPS)

1.  Go to the **SSL** tab in your Site dashboard.
2.  Select **LetsEncrypt**.
3.  Click **Obtain Certificate**.

### 7. Environment Variables

If you need to change the port or set `NODE_ENV`:

1.  You can create a `.env` file in your site root manually, or pass variables in the Daemon command.
2.  Better approach: Create a `.env` file in `/home/forge/imgpressor.yourdomain.com/.env` with:
    ```
    PORT=3001
    NODE_ENV=production
    ```

## Verification

1.  Visit your domain (e.g., `https://imgpressor.yourdomain.com`).
2.  You should see the ImgPressor interface.
3.  Test uploading an image.

## WordPress Configuration

1.  In your WordPress Admin, go to **Settings > ImgPressor**.
2.  Enable **Remote Processing**.
3.  Enter your new URL: `https://imgpressor.yourdomain.com`.
4.  Save and test.
