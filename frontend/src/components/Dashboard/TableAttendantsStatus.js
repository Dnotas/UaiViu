import React from "react";

import Paper from "@material-ui/core/Paper";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';
import Skeleton from "@material-ui/lab/Skeleton";

import { makeStyles } from "@material-ui/core/styles";
import { green, red, orange, amber } from '@material-ui/core/colors';

import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import moment from 'moment';

import Rating from '@material-ui/lab/Rating';
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
	on: {
		color: green[600],
		fontSize: '20px'
	},
	off: {
		color: red[600],
		fontSize: '20px'
	},
    pointer: {
        cursor: "pointer"
    },
    rateHigh: {
        color: red[700],
        fontWeight: "bold",
    },
    rateMed: {
        color: orange[700],
        fontWeight: "bold",
    },
    rateLow: {
        color: green[700],
        fontWeight: "bold",
    },
    rateNone: {
        color: "#BDBDBD",
    },
    progressBar: {
        display: "inline-block",
        height: 8,
        borderRadius: 4,
        backgroundColor: "#e0e0e0",
        width: 60,
        verticalAlign: "middle",
        marginRight: 6,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
        transition: "width 0.3s",
    },
}));

export function RatingBox ({ rating }) {
    const ratingTrunc = rating === null ? 0 : Math.trunc(rating);
    return <Rating
        defaultValue={ratingTrunc}
        max={3}
        readOnly
    />
}

function DifficultyBadge({ value }) {
    const classes = useStyles();
    if (!value || value === 0) return <span className={classes.rateNone}>—</span>;
    const rounded = Math.round(value);
    const colors = { 1: "#4CAF50", 2: "#8BC34A", 3: "#FF9800", 4: "#FF5722", 5: "#F44336" };
    const color = colors[rounded] || "#FF9800";
    return (
        <Tooltip title={`Média: ${value.toFixed(1)} estrela${value !== 1 ? "s" : ""}`}>
            <span style={{ color, fontWeight: "bold", fontSize: "1rem" }}>
                {"★".repeat(rounded)}{"☆".repeat(5 - rounded)}
                <span style={{ marginLeft: 4, fontSize: "0.75rem" }}>{value.toFixed(1)}</span>
            </span>
        </Tooltip>
    );
}

function RatingRate({ rated, closed }) {
    const classes = useStyles();
    if (!closed || closed === 0) return <span className={classes.rateNone}>—</span>;
    const pct = Math.round((rated / closed) * 100);
    const color = pct >= 70 ? "#4CAF50" : pct >= 30 ? "#FF9800" : "#F44336";
    return (
        <Tooltip title={`${rated} de ${closed} tickets avaliados`}>
            <span>
                <span className={classes.progressBar}>
                    <span className={classes.progressFill} style={{ width: `${pct}%`, backgroundColor: color }} />
                </span>
                <span style={{ fontSize: "0.8rem", color }}>{pct}%</span>
            </span>
        </Tooltip>
    );
}

export default function TableAttendantsStatus(props) {
    const { loading, attendants } = props;
	const classes = useStyles();

    function renderList () {
        return attendants.map((a, k) => (
            <TableRow key={k}>
                <TableCell>{a.name}</TableCell>
                <TableCell align="center">
                    <RatingBox rating={a.rating} />
                </TableCell>
                <TableCell align="center">{formatTime(a.avgSupportTime)}</TableCell>
                <TableCell align="center">
                    <DifficultyBadge value={a.avgDifficulty} />
                </TableCell>
                <TableCell align="center">
                    <RatingRate rated={a.ratedTickets} closed={a.closedTickets} />
                </TableCell>
                <TableCell align="center">
                    { a.online ?
                        <CheckCircleIcon className={classes.on} />
                        : <ErrorIcon className={classes.off} />
                    }
                </TableCell>
            </TableRow>
        ))
    }

	function formatTime(minutes){
		return moment().startOf('day').add(minutes, 'minutes').format('HH[h] mm[m]');
	}

    return ( !loading ?
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{i18n.t("dashboard.onlineTable.name")}</TableCell>
                        <TableCell align="center">{i18n.t("dashboard.onlineTable.ratings")}</TableCell>
                        <TableCell align="center">{i18n.t("dashboard.onlineTable.avgSupportTime")}</TableCell>
                        <TableCell align="center">Dif. Média</TableCell>
                        <TableCell align="center">Taxa Avaliação</TableCell>
                        <TableCell align="center">{i18n.t("dashboard.onlineTable.status")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { renderList() }
                </TableBody>
            </Table>
        </TableContainer>
        : <Skeleton variant="rect" height={150} />
    )
}
