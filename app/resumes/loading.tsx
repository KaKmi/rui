import { Skeleton } from '@/components/ui/Skeleton';

/** spec §6.6.2：/resumes 表头不渲染骨架，10 行表体 = ScoreRing 圆 + 6 列文字骨架 */
export default function ResumesLoading() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Skeleton w={100} h={28} />
          <div style={{ height: 8 }} />
          <Skeleton w={180} h={12} />
        </div>
      </div>

      <div className="filter-row">
        <Skeleton w={180} h={30} />
        <Skeleton w={220} h={30} />
        <div className="filter-spacer" />
        <Skeleton w={220} h={30} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 76 }}>评分</th>
              <th>候选人</th>
              <th>投递 JD</th>
              <th>当前公司</th>
              <th>年限</th>
              <th>期望薪资</th>
              <th style={{ textAlign: 'right' }}>投递时间</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <Skeleton w={40} h={40} radius="pill" />
                </td>
                <td>
                  <Skeleton w={80} h={14} />
                </td>
                <td>
                  <Skeleton w={120} h={14} />
                </td>
                <td>
                  <Skeleton w={140} h={14} />
                </td>
                <td>
                  <Skeleton w={36} h={14} />
                </td>
                <td>
                  <Skeleton w={64} h={14} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Skeleton w={56} h={12} style={{ marginLeft: 'auto' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
