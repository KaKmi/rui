import { Skeleton } from '@/components/ui/Skeleton';

/** spec §6.6.2：/jobs 列表骨架 = 2 列 × 3 行卡片 */
export default function JobsLoading() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Skeleton w={120} h={28} />
          <div style={{ height: 8 }} />
          <Skeleton w={180} h={12} />
        </div>
      </div>

      <div className="filter-row">
        <Skeleton w={260} h={32} radius="pill" />
        <div className="filter-spacer" />
        <Skeleton w={220} h={30} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 'var(--s-4)',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton w="60%" h={20} />
            <Skeleton w="40%" h={12} />
            <Skeleton w="50%" h={12} />
            <div style={{ display: 'flex', gap: 6 }}>
              <Skeleton w={48} h={20} radius="pill" />
              <Skeleton w={60} h={20} radius="pill" />
              <Skeleton w={56} h={20} radius="pill" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
