# GitHub Connection Guide

Your ElectriScribe project is now git-initialized and ready to connect to GitHub!

## 🎯 Current Status

✅ Git repository initialized
✅ Initial commit created (54 files, 17,044+ lines)
✅ `.gitignore` configured for Node, Python, and sensitive files
✅ `.env` excluded from version control
✅ Ready to push to GitHub

## 📋 Steps to Connect to GitHub

### Option 1: Create New Repository on GitHub (Recommended)

1. **Go to GitHub and create a new repository**:
   - Visit: https://github.com/new
   - Repository name: `electriscribe` (or your preferred name)
   - Description: "Consciousness-aware electrical design system with multi-dimensional constraint validation"
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

2. **Connect your local repository to GitHub**:
   ```bash
   # Replace YOUR_USERNAME with your actual GitHub username
   git remote add origin https://github.com/YOUR_USERNAME/electriscribe.git

   # Push your code to GitHub
   git push -u origin main
   ```

3. **Verify the push**:
   - Refresh your GitHub repository page
   - You should see all 54 files

### Option 2: Use GitHub CLI (if installed)

```bash
# Create repository and push in one command
gh repo create electriscribe --public --source=. --push

# Or for private repository
gh repo create electriscribe --private --source=. --push
```

### Option 3: Use SSH (if you have SSH keys configured)

```bash
# Add remote with SSH
git remote add origin git@github.com:YOUR_USERNAME/electriscribe.git

# Push to GitHub
git push -u origin main
```

## 🔐 Important Security Notes

### Protected Files (Already in .gitignore)

These files are **NOT** pushed to GitHub for security:

- `.env` - Contains your Supabase credentials
- `node_modules/` - NPM dependencies (regenerated with `npm install`)
- `dist/` - Build artifacts
- `__pycache__/` - Python cache files
- `venv/` - Python virtual environment

### What Users Need to Do After Cloning

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Then edit .env with actual credentials
```

## 📦 Repository Structure on GitHub

Your repository will include:

```
electriscribe/
├── README.md                      # Project overview
├── PYTHON_API_SETUP.md           # Python API setup guide
├── GITHUB_SETUP.md               # This file
├── .env.example                  # Template for environment variables
├── .gitignore                    # Git ignore rules
├── package.json                  # Node.js dependencies
├── requirements.txt              # Python dependencies
├── src/                          # Source code
├── supabase/migrations/          # Database migrations
└── ...
```

## 🚀 Next Steps After Pushing

1. **Add GitHub repository secrets** (for CI/CD if needed):
   - Go to: Settings → Secrets and variables → Actions
   - Add secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

2. **Enable GitHub Pages** (if you want to host docs):
   - Go to: Settings → Pages
   - Select source: `main` branch, `/docs` folder

3. **Add collaborators**:
   - Go to: Settings → Collaborators
   - Invite team members

4. **Configure branch protection** (optional):
   - Go to: Settings → Branches
   - Add rule for `main` branch
   - Require pull request reviews

## 🔄 Common Git Commands for Future Updates

```bash
# Check status
git status

# Stage all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create a new branch
git checkout -b feature/your-feature-name

# View commit history
git log --oneline
```

## 🆘 Troubleshooting

### "Permission denied" error

**Solution**: Set up GitHub authentication:
- HTTPS: Use Personal Access Token (classic) with `repo` scope
  - Create at: https://github.com/settings/tokens
  - Use token instead of password when prompted
- SSH: Add SSH key to GitHub
  - Guide: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### "Repository not found" error

**Solution**: Check your remote URL:
```bash
git remote -v
# If wrong, update it:
git remote set-url origin https://github.com/CORRECT_USERNAME/CORRECT_REPO.git
```

### Accidentally committed `.env` file

**Solution**: Remove it from git history:
```bash
git rm --cached .env
git commit -m "Remove .env from version control"
git push
```

Then verify `.env` is in `.gitignore` (it already is).

## 📞 Need Help?

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Docs**: https://docs.github.com
- **Git Cheat Sheet**: https://education.github.com/git-cheat-sheet-education.pdf

---

**Ready to push?** Run the commands from Option 1 above! 🚀
