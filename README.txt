Render Build Command를 이걸로:

npm install --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build

또는 더 확실하게:

npm install --include=dev && npm install -D typescript @types/react @types/node --include=dev && npx prisma generate && npx prisma migrate deploy && npx next build --no-lint
