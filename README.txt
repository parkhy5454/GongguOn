1. 이 파일을 GongguOn 루트에 덮어쓰기
2. Render Build Command 변경:
npm install && npm install --save-dev typescript @types/react @types/node && npx prisma generate && npx prisma migrate deploy && npm run build
3. package.json에 web-push 추가
