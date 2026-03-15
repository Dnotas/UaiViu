import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Tooltip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";

const useStyles = makeStyles((theme) => ({
  starsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  starButton: {
    padding: theme.spacing(0.5),
  },
  starIcon: {
    fontSize: 48,
    cursor: "pointer",
    transition: "transform 0.1s",
    "&:hover": {
      transform: "scale(1.2)",
    },
  },
  subtitle: {
    textAlign: "center",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  difficultyLabel: {
    textAlign: "center",
    fontWeight: "bold",
    minHeight: 24,
    color: theme.palette.primary.main,
  },
}));

const DIFFICULTY_LABELS = {
  0: "",
  1: "⭐ Fácil — resolvido rapidamente",
  2: "⭐⭐ Simples — pouco esforço",
  3: "⭐⭐⭐ Moderado — esforço médio",
  4: "⭐⭐⭐⭐ Difícil — exigiu bastante",
  5: "⭐⭐⭐⭐⭐ Muito difícil — complexo",
};

const STAR_COLORS = {
  1: "#4CAF50",
  2: "#8BC34A",
  3: "#FF9800",
  4: "#FF5722",
  5: "#F44336",
};

const DifficultyRatingModal = ({ open, onClose, onConfirm }) => {
  const classes = useStyles();
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);

  const displayValue = hovered || selected;

  const handleConfirm = () => {
    onConfirm(selected || null);
    setSelected(0);
    setHovered(0);
  };

  const handleSkip = () => {
    onConfirm(null);
    setSelected(0);
    setHovered(0);
  };

  const handleClose = () => {
    setSelected(0);
    setHovered(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Avaliar Dificuldade do Chamado</DialogTitle>
      <DialogContent>
        <Typography className={classes.subtitle}>
          Como foi resolver este chamado?
        </Typography>
        <Box className={classes.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Tooltip key={star} title={DIFFICULTY_LABELS[star]}>
              <IconButton
                className={classes.starButton}
                onClick={() => setSelected(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
              >
                {displayValue >= star ? (
                  <StarIcon
                    className={classes.starIcon}
                    style={{ color: STAR_COLORS[displayValue] || "#FF9800" }}
                  />
                ) : (
                  <StarBorderIcon
                    className={classes.starIcon}
                    style={{ color: "#BDBDBD" }}
                  />
                )}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        <Typography className={classes.difficultyLabel}>
          {DIFFICULTY_LABELS[displayValue]}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSkip} color="default">
          Pular
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          variant="contained"
          disabled={selected === 0}
        >
          Confirmar e Encerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DifficultyRatingModal;
