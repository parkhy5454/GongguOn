[코딩 몰라도 되는 복구 방법]

1. GitHub 들어가기: https://github.com/parkhy5454/GongguOn

2. Add file > Upload files 클릭

3. 이 폴더 안에 있는 모든 파일을 드래그해서 업로드:
   - package.json
   - next.config.js
   - jsconfig.json
   - lib/db.js
   - src/lib/db.js
   - src/lib/prisma.js
   - app/api/push/send/route.js

4. 아래에 Commit message: "fix build" 쓰고 Commit

5. Render 대시보드 가서:
   - Build Command를 아래로 변경:
     npm install && npx prisma generate && npx prisma migrate deploy && npm run build
   - Manual Deploy > Clear build cache & deploy 클릭

끝!
