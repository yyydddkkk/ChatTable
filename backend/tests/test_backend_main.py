import main as backend_main


def test_backend_main_runs_real_app(monkeypatch) -> None:
    captured: dict = {}

    def fake_run(app: str, host: str, port: int, reload: bool) -> None:
        captured.update(
            {
                "app": app,
                "host": host,
                "port": port,
                "reload": reload,
            }
        )

    monkeypatch.setattr(backend_main.uvicorn, "run", fake_run)
    monkeypatch.setattr(backend_main.settings, "host", "127.0.0.1")
    monkeypatch.setattr(backend_main.settings, "port", 9000)
    monkeypatch.setattr(backend_main.settings, "debug", True)

    backend_main.main()

    assert captured == {
        "app": "app.main:app",
        "host": "127.0.0.1",
        "port": 9000,
        "reload": True,
    }
