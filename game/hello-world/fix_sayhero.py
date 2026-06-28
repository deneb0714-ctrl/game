import re

def fix_sayhero():
    filepath = 'src/scenes/BossScene.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The sayHero definitions are slightly different depending on if they include enemyFrame/enemyLabel or not.
    # So we'll use a regex that matches `const sayHero = ... this.showDialogue('勇者', text, res); });`
    
    # We want to inject the setTexture logic before this.showDialogue('勇者', text, res);
    
    def repl(match):
        prefix = match.group(1)
        return prefix + " if (text === '「……」' || text === '「……。」' || text === '「…」') { this.heroImage.setTexture('hero_stand_silent'); } else { this.heroImage.setTexture('hero_stand'); } this.showDialogue('勇者', text, res); });"

    # Regex to match the showDialogue call in sayHero
    new_content = re.sub(r'(const sayHero = \(text\) => new Promise\(res => \{.*?)(this\.showDialogue\(\'勇者\', text, res\); \}\);)', repl, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Success. Modified sayHero functions.")

if __name__ == '__main__':
    fix_sayhero()
