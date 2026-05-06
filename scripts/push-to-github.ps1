param(
  [Parameter(Mandatory=$true)] [string]$GitHubUser,
  [string]$RepoName = "ai-video-forge"
)

git init
git add .
git commit -m "Initial AI Video Forge website"
git branch -M main
git remote add origin "https://github.com/$GitHubUser/$RepoName.git"
git push -u origin main
