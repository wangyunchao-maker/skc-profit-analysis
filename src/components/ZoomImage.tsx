import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PlaceholderImage } from './PlaceholderImage';

/**
 * 可点击放大的商品图片：点击缩略图弹出大图预览，Esc/点击遮罩/关闭按钮关闭。
 * 无图时显示占位图且不可点击。
 *
 * 预览弹窗通过 Portal 挂载到 document.body：
 * 表格内的 sticky 单元格（z-10）会形成独立层叠上下文，
 * 若弹窗留在单元格内，其 z-50 会被困住，其他 sticky 列会盖在遮罩上显示白色。
 */
export function ZoomImage({
  image,
  className = 'h-10 w-10',
}: {
  image?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!image) return <PlaceholderImage className={className} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded transition hover:opacity-80 focus:outline-none"
        title="点击放大"
      >
        <img src={image} alt="" className={`rounded object-contain ${className}`} />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={image}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] max-w-[85vw] rounded shadow-2xl object-contain"
            />
          </div>,
          document.body
        )}
    </>
  );
}
