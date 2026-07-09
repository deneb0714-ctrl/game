var fso = new ActiveXObject("Scripting.FileSystemObject");
var f = fso.OpenTextFile("src/scenes/BossScene.js", 1);
var code = f.ReadAll();
f.Close();
try {
  // eval code to check syntax
  new Function(code);
  WScript.Echo("Syntax OK");
} catch(e) {
  WScript.Echo("Line " + e.line + ": " + e.message);
}
