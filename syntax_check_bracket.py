import codecs
import re

def strip_line[code]:
    code = re.sub[r"'[^'\\]*[?:\\.[^'\\]*]*'", "''", code]
    code = re.sub[r'"[^"\\]*[?:\\.[^"\\]*]*"', '""', code]
    code = re.sub[r'`[^`\\]*[?:\\.[^`\\]*]*`', '``', code]
    code = re.sub[r'//.*', '', code]
    return code

def blank_comments[match]:
    return '\n' * match.group[0].count['\n']

content = codecs.open['src/scenes/BossScene.js', 'r', 'utf-8'].read[]
content = re.sub[r'/\*.*?\*/', blank_comments, content, flags=re.DOTALL]
lines = content.splitlines[]

stack = 0
for i, line in enumerate[lines]:
    line_stripped = strip_line[line]
    left = line_stripped.count['[']
    right = line_stripped.count[']']
    stack += left - right
    if stack < 0:
        print[f'Parenthesis dropped below 0 at line {i+1}']
        for k in range[i-5, i+2]:
            print[f'{k+1}: {lines[k]}']
        break
print['Final parenthesis stack:', stack]
