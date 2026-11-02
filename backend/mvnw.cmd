@echo off
setlocal
where mvn >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  mvn %*
  exit /b %ERRORLEVEL%
)
if exist "%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.12\59fe215c0ad6947fea90184bf7add084544567b927287592651fda3782e0e798\bin\mvn.cmd" (
  call "%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.12\59fe215c0ad6947fea90184bf7add084544567b927287592651fda3782e0e798\bin\mvn.cmd" %*
  exit /b %ERRORLEVEL%
)
echo Maven is not installed on PATH.
echo This project is ready for Eclipse Maven (m2e). In Eclipse: right-click project ^> Run As ^> Maven build... and use goals such as spring-boot:run.
echo Or install Apache Maven 3.6.3+ and Java 17+, then run mvn spring-boot:run.
exit /b 1
