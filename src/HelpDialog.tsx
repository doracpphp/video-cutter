import { useEffect, useRef } from 'react'
import './HelpDialog.css'

interface Props {
  onClose: () => void
}

const STEPS = [
  {
    icon: '📂',
    title: 'ファイルを開く',
    desc: '画面上部の「ファイルを開く」をクリックするか、動画ファイルをドラッグ＆ドロップします。MP4・MOV・AVI・MKV・WebM 形式に対応しています。',
  },
  {
    icon: '▶',
    title: '動画を再生する',
    desc: 'プレイヤーのコントロールで再生・一時停止・シークができます。タイムラインバーをクリックしても任意の位置にジャンプできます。',
  },
  {
    icon: '◆',
    title: 'マーカーを追加する',
    desc: 'カットしたい位置で「マーカー追加」ボタンを押します。マーカーはいくつでも追加でき、右パネルの「マーカー」タブで一覧確認・削除が可能です。マーカーをクリックするとその位置にジャンプします。',
  },
  {
    icon: '✂',
    title: '動画を分割する',
    desc: 'マーカーを追加すると「セグメント」タブに分割プレビューが表示されます。内容を確認したら「分割してエクスポート」ボタンを押します。処理はすべてブラウザ内で完結し、ファイルはサーバーに送信されません。',
  },
  {
    icon: '⬇',
    title: 'ダウンロードする',
    desc: '処理が完了すると「ダウンロード」タブに各セグメントが表示されます。セグメントごとにダウンロードボタンから保存できます。',
  },
]

export default function HelpDialog({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // ESC キーで閉じる
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // フォーカストラップ
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="hd-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="使い方">
      <div className="hd-dialog" ref={dialogRef} tabIndex={-1}>

        <div className="hd-header">
          <h2 className="hd-title">使い方</h2>
          <button className="hd-close" onClick={onClose} aria-label="閉じる">✕</button>
        </div>

        <div className="hd-body">
          <p className="hd-lead">
            Video Cutter は動画をブラウザ上でカット・分割できるツールです。<br />
            ファイルはすべてお使いのデバイス内で処理され、外部サーバーには送信されません。
          </p>

          <ol className="hd-steps">
            {STEPS.map((step, i) => (
              <li key={i} className="hd-step">
                <div className="hd-step-icon">{step.icon}</div>
                <div className="hd-step-body">
                  <div className="hd-step-num">STEP {i + 1}</div>
                  <div className="hd-step-title">{step.title}</div>
                  <div className="hd-step-desc">{step.desc}</div>
                </div>
              </li>
            ))}
          </ol>

          <div className="hd-tips">
            <div className="hd-tips-title">💡 Tips</div>
            <ul>
              <li>タイムラインのカラーバーはセグメントごとに色分けされています</li>
              <li>マーカーのタイムコードをクリックするとその位置にジャンプします</li>
              <li>分割処理には動画の長さやファイルサイズにより時間がかかる場合があります</li>
              <li>対応最大ファイルサイズは 2GB です</li>
            </ul>
          </div>
        </div>

        <div className="hd-footer">
          <button className="ps-btn ps-btn-primary" onClick={onClose}>閉じる</button>
        </div>

      </div>
    </div>
  )
}
