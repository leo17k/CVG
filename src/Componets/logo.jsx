const Logo = ({ width, height, event }) => (
    <img
        src="CVG_CABELUM.png"
        className={`
            logo object-cover z-20 rounded-xl drop-shadow-xl 
            transition-transform duration-200 ease 
            ${event ? 'translate-x-[-180px]' : 'translate-x-0'}
        `}
        style={{ width: width, height: height }}
        alt="CVG Cabelum Logo"
        onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/${width || 80}x${height || 80}/2563EB/FFFFFF?text=Logo`;
        }}
    />
);

export default Logo;