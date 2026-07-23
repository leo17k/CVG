import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../utils';
import CustomSelect from './Select';
import { TrendingUp } from 'lucide-react';

const data = [
    { name: 'Enero', value: 400, fill: '#6366f1' }, // Indigo 500
    { name: 'Febrero', value: 300, fill: '#8b5cf6' }, // Violet 500
    { name: 'Marzo', value: 300, fill: '#ec4899' }, // Pink 500
    { name: 'Abril', value: 200, fill: '#10b981' }, // Emerald 500
    { name: 'Mayo', value: 278, fill: '#f59e0b' }, // Amber 500
];

const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;

    return (
        <g>
            <text x={cx} y={cy} dy={-20} textAnchor="middle" fill={fill} className="text-xl font-bold">
                {payload.name}
            </text>
            <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#374151" className="text-sm">
                {`Ventas: ${value}`}
            </text>
            <text x={cx} y={cy} dy={30} textAnchor="middle" fill="#9ca3af" className="text-xs">
                {`(${(props.percent * 100).toFixed(2)}%)`}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 10}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 12}
                outerRadius={outerRadius + 20}
                fill={fill}
            />
        </g>
    );
};

const Grafica = ({ className }) => {
    // Initialize with the index of the highest value
    const initialActiveIndex = useMemo(() => {
        let maxIndex = 0;
        let maxValue = -Infinity;
        data.forEach((item, index) => {
            if (item.value > maxValue) {
                maxValue = item.value;
                maxIndex = index;
            }
        });
        return maxIndex;
    }, []);

    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const handleSelectChange = (value) => {
        const index = data.findIndex(item => item.name === value);
        if (index !== -1) {
            setActiveIndex(index);
        }
    };

    const selectOptions = useMemo(() =>
        data.map(item => ({ label: item.name, value: item.name })),
        []);

    const activeItem = data[activeIndex] || data[0];

    return (
        <div className={cn("flex h-full flex-col w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm", className)}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Distribución de Ventas
                    </h3>
                    <p className="text-sm text-gray-500">Selecciona un mes para ver detalles</p>
                </div>
                <div className="w-full sm:w-auto">
                    <CustomSelect
                        options={selectOptions}
                        placeholder="Seleccionar Mes"
                        onChange={handleSelectChange}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Chart Section */}
                <div className="col-span-2 size-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                dataKey="value"
                                onMouseEnter={onPieEnter}
                                paddingAngle={2}
                                cornerRadius={4}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Info/Emphasis Section */}
                <div className="col-span-1 flex flex-col justify-center space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Detalles del Mes</h4>

                    <div className="space-y-1">
                        <span className="text-3xl font-bold text-gray-900 block">
                            {activeItem.name}
                        </span>
                        <span className="text-xl font-semibold" style={{ color: activeItem.fill }}>
                            {activeItem.value} ventas
                        </span>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                            El mes de <strong>{activeItem.name}</strong> representa una parte importante del total anual.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeItem.fill }}></div>
                        Indicador de color
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Grafica;
