# Marp Preview Zoom (local)

[Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) のプレビューで、スライドを PDF ビューアのように拡大・縮小するローカル拡張です。

- 拡大・縮小するのはプレビュー内のスライド表示だけです。VS Code の UI やエディターの文字サイズは変わりません。
- Markdown、テーマ、レイアウト、書き出し結果（PDF / HTML / PPTX）は変更しません。
- Marp 拡張本体は改変しません。VS Code 標準の `markdown.previewScripts` でプレビューに JS を追加するだけです（Marp はプレビュー内の外部 CSS を無効化するため、見た目は JS からインラインで当てています）。

## 動作環境

- VS Code 1.80 以降（1.139 でインストールを確認）
- Marp for VS Code（3.6.1 でインストールを確認）
- パッケージ化に Node.js（`npx`）を使います

## インストール

```bash
git clone https://github.com/ishigaki0302/marp-preview-zoom-.git marp-preview-zoom
cd marp-preview-zoom
npx --yes @vscode/vsce package --allow-missing-repository --skip-license -o marp-preview-zoom.vsix
code --install-extension marp-preview-zoom.vsix
```

インストール後、コマンドパレットで **Developer: Reload Window** を実行してください。開いているプレビューに反映されます。

アンインストールは次のコマンドで行います。

```bash
code --uninstall-extension local.marp-preview-zoom
```

## 使い方

Marp のスライド（`marp: true`）を Markdown プレビューで開くと、右上にツールバーが出ます。

| 操作 | 動作 |
| --- | --- |
| Ctrl/Cmd＋マウスホイール | マウスポインターの位置を中心に拡大・縮小 |
| トラックパッドのピンチ | 同上 |
| `−` / `＋` | 1 段階ずつ縮小・拡大（画面中央が基準） |
| 倍率表示 | スライドの元のサイズ（例: 幅 1280px）に対する倍率 |
| `100%` | スライドを等倍で表示 |
| `Fit` | 表示領域の幅に合わせる（Marp の通常表示） |

- 拡大して表示領域からはみ出した部分は、ドラッグ（画像ビューアと同じ）か縦横のスクロールで確認できます。
- 編集でプレビューが更新されても、倍率とスクロール位置を引き継ぎます。
- 倍率の範囲は Fit の 0.25〜8 倍です。

## 注意点

- 標準プレビューの「エディターとのスクロール同期」が働くと、拡大中に表示位置が動くことがあります。気になる場合は設定で `markdown.preview.scrollPreviewWithEditor` を `false` にしてください。
- 倍率は保存しません。プレビューを開き直すと Fit に戻ります。

## 仕組み

`preview/zoom.js` は、Marp のスライド表示部分（`#__marp-vscode`）を `transform: scale` で拡大します。Marp はスライドを表示領域の幅に合わせ直すため、CSS の `zoom` だと打ち消されます。拡大した分は余白（margin）で確保するので、はみ出した部分もスクロールで見られます。プレビューの再描画（`vscode.markdown.updateContent` イベント）のたびに倍率をかけ直します。

## 修正後の入れ直し

`preview/` 以下を編集したら、上の「インストール」の `npx ... package` と `code --install-extension` をもう一度実行し、ウィンドウをリロードしてください。
