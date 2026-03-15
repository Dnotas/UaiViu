import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import brLocale from 'date-fns/locale/pt-BR';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Button, Stack, TextField, Typography as MuiTypography } from '@mui/material';
import Typography from "@material-ui/core/Typography";
import api from '../../services/api';
import { format, subMonths } from 'date-fns';
import { toast } from 'react-toastify';
import './button.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

export const ChartsDifficulty = () => {
    const [initialDate, setInitialDate] = useState(subMonths(new Date(), 5));
    const [finalDate, setFinalDate] = useState(new Date());
    const [trendData, setTrendData] = useState([]);

    const companyId = localStorage.getItem("companyId");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data } = await api.get(`/dashboard/difficultyTrend`, {
                params: {
                    date_from: format(initialDate, 'yyyy-MM-dd'),
                    date_to: format(finalDate, 'yyyy-MM-dd'),
                    companyId,
                }
            });
            setTrendData(data.data || []);
        } catch (error) {
            toast.error("Erro ao carregar tendência de dificuldade");
        }
    };

    const labels = trendData.map(d => d.label);

    const chartData = {
        labels,
        datasets: [
            {
                type: 'bar',
                label: 'Tickets Encerrados',
                data: trendData.map(d => d.totalTickets),
                backgroundColor: 'rgba(45, 221, 127, 0.6)',
                borderColor: '#2DDD7F',
                borderWidth: 1,
                yAxisID: 'yTickets',
                order: 2,
            },
            {
                type: 'bar',
                label: 'Tickets Avaliados',
                data: trendData.map(d => d.ratedTickets),
                backgroundColor: 'rgba(33, 150, 243, 0.5)',
                borderColor: '#2196F3',
                borderWidth: 1,
                yAxisID: 'yTickets',
                order: 3,
            },
            {
                type: 'line',
                label: 'Dificuldade Média (1-5)',
                data: trendData.map(d => d.ratedTickets > 0 ? d.avgDifficulty : null),
                borderColor: '#FF5722',
                backgroundColor: 'rgba(255, 87, 34, 0.15)',
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: '#FF5722',
                tension: 0.3,
                yAxisID: 'yDifficulty',
                order: 1,
                spanGaps: false,
            },
        ],
    };

    const options = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                display: true,
            },
            title: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        if (ctx.dataset.label === 'Dificuldade Média (1-5)') {
                            const val = ctx.parsed.y;
                            if (val === null) return `${ctx.dataset.label}: sem avaliações`;
                            const stars = '★'.repeat(Math.round(val)) + '☆'.repeat(5 - Math.round(val));
                            return `${ctx.dataset.label}: ${val.toFixed(2)} ${stars}`;
                        }
                        return `${ctx.dataset.label}: ${ctx.parsed.y}`;
                    }
                }
            }
        },
        scales: {
            yTickets: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Nº de Tickets' },
                beginAtZero: true,
                ticks: { stepSize: 1 },
            },
            yDifficulty: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Dificuldade Média' },
                min: 0,
                max: 5,
                grid: { drawOnChartArea: false },
                ticks: {
                    stepSize: 1,
                    callback: (val) => ['', '★', '★★', '★★★', '★★★★', '★★★★★'][val] || val,
                },
            },
        },
    };

    return (
        <>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
                Tendência de Dificuldade por Mês
            </Typography>

            <Stack direction={'row'} spacing={2} alignItems={'center'} sx={{ my: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
                    <DatePicker
                        value={initialDate}
                        onChange={(v) => setInitialDate(v)}
                        label="Data Inicial"
                        renderInput={(params) => <TextField fullWidth {...params} sx={{ width: '20ch' }} />}
                    />
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
                    <DatePicker
                        value={finalDate}
                        onChange={(v) => setFinalDate(v)}
                        label="Data Final"
                        renderInput={(params) => <TextField fullWidth {...params} sx={{ width: '20ch' }} />}
                    />
                </LocalizationProvider>
                <Button className="buttonHover" onClick={loadData} variant="contained">
                    Filtrar
                </Button>
            </Stack>

            {trendData.length === 0 ? (
                <MuiTypography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                    Nenhum dado encontrado para o período. Verifique se já existem tickets encerrados com avaliação.
                </MuiTypography>
            ) : (
                <Chart type="bar" data={chartData} options={options} style={{ maxHeight: 320 }} />
            )}
        </>
    );
};
