'use client';

import { useState } from 'react';
import { useCapabilities } from '../../lib/useCapabilities';
import { useSession } from '../../lib/session';
import { apiErrorMessage } from '../../lib/api';
import type { AnnouncementView } from '../../lib/types';
import { AnnouncementList } from './AnnouncementList';
import { AnnounceSheet } from './AnnounceSheet';
import { announcementErrorMessage, useDeleteAnnouncement } from './hooks';
import { canManageAnnouncement } from './canManage';
import { Button, ErrorNotice, SectionHead, Sheet } from '../../components/ui';
import { Icon } from '../../components/Icon';

// 公告。家長只讀（一份列表），能發公告的人多一顆按鈕。
//
// 舊版是「發布面板」在上、「公告列表」在下，兩塊都常駐。但即使是老師，
// 進這一頁十次有九次是來看有沒有新的 —— 發布是例外，所以收進底部面板。
//
// 桌面版 /admin/announcement 與手機版 /liff/announcement 共用這一份（docs/04 §3b）。
export function AnnouncementBoard() {
  // useCapabilities 不是 roleFlags：老師兼家長切到家長身分時，這一頁不該有發布入口
  // （Human Owner 2026-08-20 回報）。他確實是老師、後端也會放行，
  // 但把「發一則公告」放在家長的世界裡，就等於這個殼沒有真的把兩個世界分開。
  const flags = useCapabilities();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementView | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementView | null>(null);
  const remove = useDeleteAnnouncement();

  // 誰能動一則已經發出去的公告 —— 規則與它的三個坑寫在 canManage.ts（有測試釘著）。
  const canManage = (a: AnnouncementView): boolean => canManageAnnouncement(flags, user.id, a);

  const closeSheet = (): void => {
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {flags.canAnnounce && (
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Icon name="mega" className="h-5 w-5" />
          發一則公告
        </Button>
      )}

      {/* 發布與編輯共用同一個面板。key 讓它在切換對象時重新掛載，
          欄位初始值才會換成那一則的內容（而不是留著上一則的字）。 */}
      {flags.canAnnounce && (
        <AnnounceSheet
          key={editing?.id ?? 'new'}
          open={open || editing !== null}
          editing={editing}
          onClose={closeSheet}
        />
      )}

      <section>
        <SectionHead
          title="公告"
          description={flags.canAnnounce ? '發出去的公告都留在這裡' : '園所與班級發布的消息'}
          weight="review"
        />
        <AnnouncementList
          canManage={canManage}
          onEdit={(a) => {
            setOpen(false);
            setEditing(a);
          }}
          onDelete={setDeleting}
        />
      </section>

      {/* 刪除確認走面板，不在原地把按鈕展開成兩顆 —— 就地展開的確認鈕會長在
          手指剛剛按過的位置上，最容易誤按（同 ClassesManager / PersonEditor）。 */}
      {deleting && (
        <Sheet
          key={deleting.id}
          open
          title={`刪除「${deleting.title}」`}
          onClose={() => setDeleting(null)}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink">
              刪掉之後這則公告就找不回來了，家長端也會一起消失。
            </p>
            {/* 講清楚刪除做得到與做不到的邊界。不說的話，園長會以為家長手機上那則
                推播也跟著不見了 —— LINE 沒有撤回已送出訊息的方法。 */}
            <p className="rounded-md2 border border-note-edge bg-note-wash px-4 py-3 text-2xs leading-relaxed text-note-text">
              已經送到家長 LINE 的那一則推播<strong className="font-bold">收不回來</strong>，
              只有 App 裡看不到了。訊息中心裡那一列會留著，但點進去會看不到內容。
            </p>
            {remove.isError && (
              <ErrorNotice
                message={announcementErrorMessage(remove.error, apiErrorMessage(remove.error))}
              />
            )}
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
              }
            >
              {remove.isPending ? '刪除中…' : '確定刪除'}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
