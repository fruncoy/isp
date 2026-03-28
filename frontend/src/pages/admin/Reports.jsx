import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function Reports() {
  // Mock data for graphs
  const repPerformance = [
    { name: 'John Doe', sales: 45, revenue: 3200 },
    { name: 'Jane Smith', sales: 38, revenue: 2900 },
    { name: 'Mike Ross', sales: 62, revenue: 4500 },
    { name: 'Sarah Lee', sales: 29, revenue: 1800 },
  ];

  const packagesDistribution = [
    { name: 'Basic 10Mbps', value: 400 },
    { name: 'Standard 25Mbps', value: 300 },
    { name: 'Premium 50Mbps', value: 300 },
    { name: 'Business 100Mbps', value: 100 },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const revenueByMonth = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
    { name: 'Jul', revenue: 3490 },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics & Reports</h1>
          <p>Insights into sales performance, revenue, and customer acquisition.</p>
        </div>
        <button className="btn btn-secondary">Export to CSV</button>
      </div>

      <div className="charts-grid" style={{ marginBottom: '24px' }}>
        {/* Revenue Line Chart */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Monthly Revenue Overview</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rep Performance Bar Chart */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Sales Rep Performance</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="sales" fill="var(--accent)" name="Total Sales" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" fill="var(--warning)" name="Revenue Generated" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ width: '50%' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Package Distribution</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={packagesDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                stroke="var(--bg-secondary)"
                strokeWidth={2}
              >
                {packagesDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
