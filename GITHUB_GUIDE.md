# How to put the STEMMate code on GitHub (genuine evidence trail)

Markers check commit history against the individual evidence files. Every member must commit their OWN work under their OWN GitHub account, on the real day they do it. Never backdate, rewrite history or commit for someone else.

## A. One person (the repository owner) creates the repo
1. Install Git (git-scm.com) and Node 22.13+. Create a free GitHub account if you do not have one.
2. On github.com click **New repository**. Name: `stemmate-group45-a4`. Choose **Public** (the brief says links must open without asking for access). Do NOT tick "Add README" (we already have one). Click Create.
3. In a terminal, go into the `source` folder from the team package:
   ```
   cd A4_Group45_Team_Package/source
   git init -b main
   git config user.name  "Your Real Name"
   git config user.email "your-github-email@example.com"
   git add .
   git status            # check: no stemmate.db, no node_modules (.gitignore handles this)
   git commit -m "Add STEMMate v2.0 vertical slice, tests and architecture sources"
   git remote add origin https://github.com/YOUR-USERNAME/stemmate-group45-a4.git
   git push -u origin main
   ```
   If GitHub asks for a password, use a Personal Access Token (GitHub > Settings > Developer settings > Tokens) or sign in with GitHub Desktop / `gh auth login`.
4. Tag the submitted version: `git tag -a v2.0 -m "A4 submission" && git push origin v2.0`.
5. Settings > Collaborators: add the other three members.

## B. Everyone else
```
git clone https://github.com/OWNER/stemmate-group45-a4.git
cd stemmate-group45-a4
git config user.name "Your Real Name"
git config user.email "your-github-email@example.com"
git checkout -b feature/your-topic          # e.g. test/manual-accessibility-results
# ... do your real work ...
git add path/to/your/files
git commit -m "Describe exactly what you did"
git push -u origin feature/your-topic
```
Open a **Pull Request** on GitHub and ask a teammate to review it. PRs, reviews and issues are strong, dated evidence for the individual evidence map.

## C. Good evidence habits
- Small commits with clear messages ("Record MT-06 offline result on Pixel phone", not "update").
- Put real manual test results, evaluation sheets (anonymous labels only) and screenshots in an `evidence/` folder and commit them on the day you produce them.
- Open GitHub **Issues** for real defects you find (label them bug / accessibility) and close them with a commit message such as `Fix #3 ...`.
- Copy each commit hash (`git log --oneline`) and PR link into your own individual evidence map.

## D. Before you submit
1. Open the repo link in a private/incognito window: it must load with no login.
2. Clean-machine test: `git clone ...` into a new folder, then `npm test` (expect 25 pass) and `npm start`.
3. Check no secrets, no `.db` files, no real names or learner data are in the repo.
4. Paste the repository URL on the report cover page and in the README.

## E. Common problems
| Problem | Fix |
|---|---|
| `remote: Permission denied` | Collaborator not added, or wrong account signed in. |
| Large or unwanted file committed | `git rm --cached file`, add it to `.gitignore`, commit. |
| `node:sqlite` not found | Upgrade Node to 22.13+. |
| Push rejected (non-fast-forward) | `git pull --rebase origin main`, then push again. |
