@REM Maven Wrapper bootstrap for Windows
@ECHO OFF
SETLOCAL
@REM Use the Windows short path so javac keeps the project output on its test classpath
@REM even when the checkout is inside a user directory containing spaces.
CD /D "%~sdp0"
SET "WRAPPER_JAR=.mvn\wrapper\maven-wrapper.jar"

IF NOT EXIST "%WRAPPER_JAR%" (
  ECHO Maven Wrapper JAR not found at %WRAPPER_JAR%
  ECHO Download it from org.apache.maven.wrapper:maven-wrapper:3.3.4 or run through Docker.
  EXIT /B 1
)

IF DEFINED JAVA_HOME (
  SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) ELSE (
  SET "JAVA_EXE=java"
)

IF NOT EXIST "%JAVA_EXE%" IF NOT "%JAVA_EXE%"=="java" (
  ECHO Java executable not found at %JAVA_EXE%
  EXIT /B 1
)

"%JAVA_EXE%" %MAVEN_OPTS% -Dmaven.multiModuleProjectDirectory=. -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
ENDLOCAL & EXIT /B %ERRORLEVEL%
