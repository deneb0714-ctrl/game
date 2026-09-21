import codecs
content1 = codecs.open('patch_hello_world2.py', 'r', 'utf-8').read()

start = content1.find('const terminalEffect = async')
end = content1.find('await localSayHero(\'「……魔王は')

if start != -1 and end != -1:
    deleted_text = content1[start:end]
    left = deleted_text.count('{')
    right = deleted_text.count('}')
    print('Deleted text left braces:', left, 'right braces:', right)
else:
    print('Not found')
