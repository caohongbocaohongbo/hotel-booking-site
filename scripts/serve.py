"""仅在本机启动静态站点，自动选择可用端口并打开浏览器。"""
import http.server, pathlib, socketserver, webbrowser

ROOT = pathlib.Path(__file__).resolve().parents[1]

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

server = None
for port in range(8765, 8796):
    try:
        server = Server(('127.0.0.1', port), Handler)
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('本机 8765—8795 端口均被占用，请关闭其它预览后重试。')
url = f'http://127.0.0.1:{port}/index.html'
print(f'酒店预订页已启动：{url}\n关闭本窗口或按 Control+C 可停止预览。', flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
