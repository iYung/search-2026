document.addEventListener('DOMContentLoaded', function() {
    const width = 1200;
    const height = 800;
    const margin = {top: 20, right: 20, bottom: 20, left: 20};

    const svg = d3.select("#sankey-chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 1], [width - 1, height - 6]]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const tooltip = d3.select(".tooltip");
    
    // Data is now passed from the build script via window.jobData
    const data = window.jobData;

    const stages = [
        "Applied", "Applied with Referral", "Recruiter Outreach",
        "Recruiter Call", "Technical Screen", "Second Round", "Panel",
        "Team Match", "Offer", "Dropped", "Rejected"
    ];

    let links = [];
    data.forEach(d => {
        let path = d.path.split(' > ');
        for (let i = 0; i < path.length - 1; i++) {
            links.push({
                source: path[i],
                target: path[i+1],
                value: 1, // Each company is a single flow
                company: d.company
            });
        }
    });

    const nodeNames = Array.from(new Set(links.flatMap(l => [l.source, l.target])));
    const graphNodes = nodeNames.map(name => ({ name }));
    const nodeMap = new Map(graphNodes.map((d, i) => [d.name, i]));

    const graphLinks = links.map(d => ({
        ...d,
        source: nodeMap.get(d.source),
        target: nodeMap.get(d.target)
    }));
    
    const graph = {
        nodes: graphNodes,
        links: graphLinks
    };

    const {nodes: sankeyNodes, links: sankeyLinks} = sankey(graph);

    // Define drag behavior
    function dragmove(event, d) {
        // Get the new Y position, constrained to the SVG boundaries
        const newY = Math.max(0, Math.min(height - (d.y1 - d.y0), event.y));

        // Update only the node's Y position
        d.y0 = newY;
        d.y1 = newY + (d.y1 - d.y0);

        // Apply the transformation to the dragged node, keeping the original X position
        d3.select(this).attr("transform", `translate(${d.x0},${d.y0})`);

        // Update the Sankey layout and redraw links
        sankey.update(graph);
        svg.selectAll(".link").attr("d", d3.sankeyLinkHorizontal());
    }

    // Draw links
    const link = svg.append("g")
        .attr("class", "links")
        .selectAll(".link")
        .data(sankeyLinks)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .style("stroke", (d,i) => color(d.company))
        .on("mouseover", function(event, d) {
            const company = d.company;
            link.style("stroke-opacity", l => l.company === company ? 0.7 : 0.2);
            link.filter(l => l.company === company).raise();

            tooltip.text(company)
                .style("opacity", 1)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            link.style("stroke-opacity", 0.4);
            tooltip.style("opacity", 0);
        });


    // Draw nodes
    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll(".node")
        .data(sankeyNodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .call(d3.drag()
            .subject(d => d)
            .on("start", function() { this.parentNode.appendChild(this); })
            .on("drag", dragmove)
        );

    node.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", sankey.nodeWidth())
        .style("fill", d => color(d.name))
        .append("title")
          .text(d => `${d.name}\n${d.value}`);

    node.append("text")
        .attr("x", -6)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .text(d => d.name)
        .filter(d => d.x0 < width / 2)
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start");
});
