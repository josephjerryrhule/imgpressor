# Deploying ImgPressor to Render

This guide will help you deploy the ImgPressor Node.js application to **Render**, a cloud platform that supports the full Node.js environment (including `sharp` for high-quality image compression).

## Prerequisites

1.  A [GitHub](https://github.com/) account (where your code is hosted).
2.  A [Render](https://render.com/) account (free tier is sufficient).

## Steps

### 1. Push Code to GitHub

Ensure your latest code (including the `app.js` file) is pushed to your GitHub repository.

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Create a New Web Service on Render

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account if you haven't already.
4.  Search for your `imgpressor` repository and click **Connect**.

### 3. Configure the Service

Fill in the details as follows:

- **Name**: `imgpressor` (or any unique name)
- **Region**: Choose the one closest to you (e.g., Oregon, Frankfurt).
- **Branch**: `main` (or your working branch)
- **Root Directory**: Leave blank (defaults to root).
- **Runtime**: **Node**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node app.js`
- **Instance Type**: **Free** (or Starter if you need more power).

### 4. Environment Variables (Optional)

If you want to set a custom API key or other variables, scroll down to the **Environment Variables** section and add them:

- `NODE_ENV`: `production`

### 5. Deploy

Click **Create Web Service**. Render will start building your application.

- It will install dependencies (including `sharp`).
- It will run the build script (Tailwind CSS).
- It will start the server using `node app.js`.

### 6. Get Your URL

Once the deployment is live (green "Live" badge), copy the URL provided by Render (e.g., `https://imgpressor.onrender.com`).

### 7. Configure WordPress Plugin

1.  Go to your WordPress Admin > **Settings** > **ImgPressor**.
2.  Check **Enable Remote Processing**.
3.  Paste your Render URL into the **API URL** field.
4.  Click **Save Changes**.

## Verification

1.  Upload an image to your WordPress Media Library.
2.  The plugin should now send the image to your Render app for compression.
3.  You can check the Render logs in the dashboard to see the request coming in.
