import React, { useRef, useEffect, useState, useMemo } from "react";
import Webcam from "react-webcam";
import "@tensorflow/tfjs-backend-webgl";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

const videoDims = { width: 640, height: 480 };

export default function FaceFilterApp() {
  const webcamRef = useRef(null);
  const carouselRef = useRef(null);

  const [model, setModel] = useState(null);
  const [faces, setFaces] = useState([]);
  const [selectedFilterId, setSelectedFilterId] = useState("all-0");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [customFilters, setCustomFilters] = useState([]);

  const baseFilters = [
    { value: "all", label: "All", image: "/all-filter.png", category: "all" },
    { value: "hat", label: "Hat Only", image: "/hat.png", category: "head" },

    {
      value: "shades",
      label: "Shades Only",
      image: "/shades.png",
      category: "eyes",
    },
    {
      value: "shades2",
      label: "Shades 2 Only",
      image: "/shades2.png",
      category: "eyes",
    },
    {
      value: "eyes",
      label: "Eye Color",
      image: "/eye-color.png",
      category: "eyes",
    },
    {
      value: "border",
      label: "Border Only",
      image: "/border.png",
      category: "frame",
    },
  ];

  const filterData = useMemo(
    () => [...baseFilters, ...customFilters],
    [customFilters]
  );

  const repeatedFilters = useMemo(
    () =>
      Array(20)
        .fill(filterData)
        .flat()
        .map((filter, index) => ({
          ...filter,
          id: `${filter.value}-${index}`,
        })),
    [filterData]
  );

  const [newFilter, setNewFilter] = useState({
    value: "",
    label: "",
    image: "",
    category: "eyes",
  });

  const selectedFilterMeta = repeatedFilters.find(
    (f) => f.id === selectedFilterId
  );
  const selectedFilter = selectedFilterMeta?.value || "all";

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) progress = 100;
      setLoadingProgress(Math.round(progress));
    }, 200);

    async function loadModel() {
      try {
        const detector = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          { runtime: "tfjs", maxFaces: 10 }
        );
        setModel(detector);
        setLoadingProgress(100);
      } catch (error) {
        console.error("Error loading model:", error);
      }

      clearInterval(interval);
    }

    loadModel();
  }, []);

  useEffect(() => {
    let rafId;
    async function detect() {
      if (model && webcamRef.current?.video?.readyState === 4) {
        const video = webcamRef.current.video;
        try {
          const predictions = await model.estimateFaces(video);
          setFaces(predictions);
        } catch (error) {
          console.error("Error detecting faces:", error);
        }
      }
      rafId = requestAnimationFrame(detect);
    }
    detect();
    return () => cancelAnimationFrame(rafId);
  }, [model]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const middleIndex = Math.floor(repeatedFilters.length / 2);
    const button = carousel.children[middleIndex];

    if (button) {
      const scrollLeft =
        button.offsetLeft - (carousel.offsetWidth - button.offsetWidth) / 2;
      carousel.scrollTo({ left: scrollLeft, behavior: "smooth" });
      setSelectedFilterId(repeatedFilters[middleIndex].id);
    }
  }, [repeatedFilters]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollLeft = carousel.scrollLeft;
        const centerX = scrollLeft + carousel.offsetWidth / 2;
        let closestId = null;
        let minDist = Infinity;
        Array.from(carousel.children).forEach((btn, i) => {
          const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
          const dist = Math.abs(centerX - btnCenter);
          if (dist < minDist) {
            minDist = dist;
            closestId = repeatedFilters[i].id;
          }
        });
        if (closestId && closestId !== selectedFilterId) {
          setSelectedFilterId(closestId);
        }
        const closestButton =
          carousel.children[
            repeatedFilters.findIndex((f) => f.id === closestId)
          ];
        if (closestButton) {
          const scrollLeft =
            closestButton.offsetLeft -
            (carousel.offsetWidth - closestButton.offsetWidth) / 2;
          carousel.scrollTo({ left: scrollLeft, behavior: "smooth" });
        }
      }, 150);
    };

    carousel.addEventListener("scroll", handleScroll);
    return () => {
      clearTimeout(timeoutId);
      carousel.removeEventListener("scroll", handleScroll);
    };
  }, [repeatedFilters, selectedFilterId]);

  const overlays = faces.map((face, idx) => {
    const lm = face?.keypoints;
    if (!lm || lm.length < 264) return null;
    const [lx, ly] = [lm[33].x, lm[33].y];
    const [rx, ry] = [lm[263].x, lm[263].y];
    const angle = (Math.atan2(ry - ly, rx - lx) * 180) / Math.PI;
    const glassesW = Math.hypot(rx - lx, ry - ly) * 1.8;
    const glassesH = glassesW / 2;
    const glassesX = lx + (rx - lx) / 2 - glassesW / 2;
    const glassesY = ly - glassesH / 3;
    const hatW = glassesW * 1.6;
    const hatH = hatW * 0.8;
    const hatX = glassesX - glassesW * 0.28;
    const hatY = glassesY - hatH * 0.8;

    const getFilterImage = (category) => {
      if (
        selectedFilter === "all" ||
        selectedFilterMeta?.category === category
      ) {
        return selectedFilterMeta?.image;
      }
      return null;
    };

    return (
      <React.Fragment key={idx}>
        {getFilterImage("head") && (
          <img
            src={getFilterImage("head")}
            alt="head filter"
            style={{
              position: "absolute",
              left: `${hatX}px`,
              top: `${hatY}px`,
              width: `${hatW}px`,
              height: `${hatH}px`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: "bottom center",
              pointerEvents: "none",
            }}
          />
        )}
        {getFilterImage("eyes") && (
          <img
            src={getFilterImage("eyes")}
            alt="eyes filter"
            style={{
              position: "absolute",
              left: `${glassesX}px`,
              top: `${glassesY}px`,
              width: `${glassesW}px`,
              height: `${glassesH}px`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: "center",
              pointerEvents: "none",
            }}
          />
        )}
        {getFilterImage("frame") && (
          <img
            src={getFilterImage("frame")}
            alt="frame filter"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${videoDims.width}px`,
              height: `${videoDims.height}px`,
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        )}
      </React.Fragment>
    );
  });

  const handleAddFilter = (e) => {
    e.preventDefault();
    if (!newFilter.value || !newFilter.image) return;
    setCustomFilters((prev) => [...prev, { ...newFilter }]);
    setNewFilter({ value: "", label: "", image: "", category: "eyes" });
  };

  return (
    <div style={{ fontFamily: "sans-serif", paddingBottom: "100px" }}>
      <div
        style={{
          position: "relative",
          width: videoDims.width,
          height: videoDims.height,
          margin: "auto",
          backgroundColor: "#000",
        }}
      >
        <Webcam
          ref={webcamRef}
          audio={false}
          width={videoDims.width}
          height={videoDims.height}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
        {overlays}
        {!model && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                border: "5px solid #fff",
                borderTop: "5px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ marginTop: "10px" }}>{loadingProgress}%</span>
          </div>
        )}
      </div>

      <div
        ref={carouselRef}
        style={{
          marginTop: "10px",
          width: videoDims.width,
          overflowX: "scroll",
          display: "flex",
          padding: "10px 0",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
        }}
      >
        {repeatedFilters.map((filter) => (
          <button
            key={filter.id}
            style={{
              flex: "0 0 auto",
              width: "70px",
              height: "70px",
              margin: "0 10px",
              borderRadius: "50%",
              background: `url(${filter.image}) center/cover no-repeat`,
              border:
                filter.id === selectedFilterId
                  ? "3px solid #3498db"
                  : "2px solid #ccc",
              scrollSnapAlign: "center",
              position: "relative",
              cursor: "pointer",
            }}
            onClick={() => {
              setSelectedFilterId(filter.id);
              const button =
                carouselRef.current.children[
                  repeatedFilters.findIndex((f) => f.id === filter.id)
                ];
              const scrollLeft =
                button.offsetLeft -
                (carouselRef.current.offsetWidth - button.offsetWidth) / 2;
              carouselRef.current.scrollTo({
                left: scrollLeft,
                behavior: "smooth",
              });
            }}
            title={filter.label}
          >
            <span
              style={{
                position: "absolute",
                bottom: "5px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "10px",
                color: "#fff",
                background: "rgba(0,0,0,0.5)",
                padding: "2px 5px",
                borderRadius: "4px",
              }}
            >
              {filter.label}
            </span>
          </button>
        ))}
      </div>

      <form
        onSubmit={handleAddFilter}
        style={{
          maxWidth: "640px",
          margin: "20px auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <input
          type="text"
          placeholder="Filter Value (unique)"
          value={newFilter.value}
          onChange={(e) =>
            setNewFilter({ ...newFilter, value: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Label"
          value={newFilter.label}
          onChange={(e) =>
            setNewFilter({ ...newFilter, label: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Image URL"
          value={newFilter.image}
          onChange={(e) =>
            setNewFilter({ ...newFilter, image: e.target.value })
          }
        />
        <select
          value={newFilter.category}
          onChange={(e) =>
            setNewFilter({ ...newFilter, category: e.target.value })
          }
        >
          <option value="eyes">Eyes</option>
          <option value="head">Head</option>
          <option value="lips">Lips</option>
          <option value="face">Full Face</option>
          <option value="frame">Frame</option>
        </select>
        <button type="submit">Add Filter</button>
      </form>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
